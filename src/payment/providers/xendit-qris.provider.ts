import {
  Injectable,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod } from '@prisma/client';
import { PaymentRequest } from 'xendit-node';
import { PaymentProvider, PaymentResult } from './payment-provider.interface';

@Injectable()
export class XenditQrisProvider implements PaymentProvider {
  method = PaymentMethod.ONLINE;
  private readonly logger = new Logger(XenditQrisProvider.name);
  private readonly paymentRequest: PaymentRequest;
  private readonly feePercent: number;

  constructor(private config: ConfigService) {
    this.paymentRequest = new PaymentRequest({
      secretKey: this.config.get<string>('XENDIT_SECRET_KEY')!,
    });
    this.feePercent = this.config.get<number>('QRIS_SERVICE_FEE_PERCENT') ?? 5;
  }

  async initiate(order: {
    id: number;
    orderCode: string;
    totalAmount: number;
    customerEmail: string;
  }): Promise<PaymentResult> {
    // Hitung fee — customer bayar totalAmount (sudah termasuk fee)
    // totalAmount = subtotal + platformFee sudah dihitung di OrderService

    try {
      const response = await this.paymentRequest.createPaymentRequest({
        data: {
          referenceId: order.orderCode,
          amount: order.totalAmount,
          currency: 'IDR',
          paymentMethod: {
            type: 'QR_CODE',
            reusability: 'ONE_TIME_USE',
            qrCode: {
              channelCode: 'QRIS',
            },
          },
          description: `Pembayaran order KantinKlik ${order.orderCode}`,
          metadata: {
            orderId: order.id,
            customerEmail: order.customerEmail,
          },
        },
      });

      const qrString = response.paymentMethod?.qrCode?.channelProperties?.qrString;

      if (!qrString) {
        this.logger.error(
          `QR string tidak ditemukan di response Xendit untuk order ${order.orderCode}`,
          JSON.stringify(response),
        );
        throw new BadGatewayException(
          'Gagal mendapatkan QR code dari Xendit. Coba lagi.',
        );
      }

      return {
        paymentStatus: 'UNPAID',
        paymentReference: response.id,
        qrCodeUrl: qrString,
      };
    } catch (err) {
      // Kalau sudah BadGatewayException dari blok di atas, re-throw
      if (err instanceof BadGatewayException) throw err;

      this.logger.error(
        `Xendit QRIS error untuk order ${order.orderCode}`,
        err,
      );
      throw new BadGatewayException(
        'Layanan pembayaran sedang bermasalah. Coba beberapa saat lagi.',
      );
    }
  }
}