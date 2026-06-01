import {
  Controller,
  Post,
  Headers,
  Body,
  HttpCode,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';

@ApiTags('Webhooks')
@SkipThrottle()
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private eventsGateway: EventsGateway,
  ) {}

  @Post('xendit')
  @HttpCode(200)
  @ApiOperation({ summary: 'Xendit payment callback (internal)' })
  @ApiExcludeEndpoint() // sembunyiin dari Swagger public docs
  async handleXenditWebhook(
    @Headers('x-callback-token') callbackToken: string,
    @Body() payload: any,
  ) {
    // 1. Verify signature
    const secret = this.config.get<string>('XENDIT_WEBHOOK_SECRET');
    if (!callbackToken || callbackToken !== secret) {
      this.logger.warn('Xendit webhook: invalid callback token');
      throw new UnauthorizedException('Invalid webhook token');
    }

    const eventType: string = payload?.event ?? payload?.status ?? '';
    const referenceId: string =
      payload?.data?.reference_id ?? payload?.reference_id ?? '';
    const xenditId: string =
      payload?.data?.id ?? payload?.id ?? '';

    this.logger.log(
      `Xendit webhook diterima — event: ${eventType}, ref: ${referenceId}`,
    );

    // 2. Cari order by paymentReference (= Xendit payment request id)
    // Xendit bisa kirim referenceId (orderCode) atau id (paymentReference)
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { paymentReference: xenditId },
          { orderCode: referenceId },
        ],
      },
      include: { orderItems: true, vendor: { select: { userId: true } } },
    });

    if (!order) {
      this.logger.warn(
        `Xendit webhook: order tidak ditemukan untuk ref ${referenceId} / id ${xenditId}`,
      );
      // Return 200 supaya Xendit tidak retry terus
      return { received: true };
    }

    // 3. Idempotency check
    if (order.paymentStatus === 'PAID') {
      this.logger.log(
        `Xendit webhook: order ${order.orderCode} sudah PAID, skip`,
      );
      return { received: true };
    }

    if (order.status === OrderStatus.CANCELLED) {
      this.logger.log(
        `Xendit webhook: order ${order.orderCode} sudah CANCELLED sebelumnya, skip`,
      );
      return { received: true };
    }

    const isSuccess =
      eventType.includes('SUCCEEDED') ||
      eventType.includes('succeeded') ||
      eventType === 'COMPLETED' ||
      payload?.status === 'SUCCEEDED';

    const isFailed =
      eventType.includes('FAILED') ||
      eventType.includes('EXPIRED') ||
      eventType.includes('failed') ||
      eventType.includes('expired') ||
      payload?.status === 'FAILED' ||
      payload?.status === 'EXPIRED';

    if (isSuccess) {
      // 4a. Pembayaran berhasil
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          paidAt: new Date(),
        },
      });
      this.logger.log(
        `Order ${order.orderCode} — pembayaran BERHASIL (PAID)`,
      );

      // Notify vendor: ada pesanan baru yang sudah dibayar
      this.eventsGateway.notifyVendorNewOrder(
        order.vendor.userId,
        order.id,
        Number(order.totalAmount),
      );
    } else if (isFailed) {
      // 4b. Pembayaran gagal/expired — cancel + restock
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.orderItems) {
          await tx.menu.update({
            where: { id: item.menuId },
            data: { stock: { increment: item.quantity } },
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
            rejectionReason: 'Pembayaran gagal atau kadaluarsa (Xendit)',
          },
        });
      });
      this.logger.log(
        `Order ${order.orderCode} — pembayaran GAGAL/EXPIRED, di-cancel + restock`,
      );

      // Notify customer: order dibatalkan karena pembayaran gagal
      this.eventsGateway.notifyCustomerOrderUpdate(
        order.customerId,
        order.id,
        'CANCELLED',
        'Pembayaran gagal atau kadaluarsa',
      );
    } else {
      this.logger.log(
        `Xendit webhook: event "${eventType}" tidak diproses (bukan SUCCESS/FAIL)`,
      );
    }

    return { received: true };
  }
}