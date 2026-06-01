import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { CheckoutOrderDto } from './dto/checkout-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';
import { generateOrderCode } from './order-code.generator';
import { OrderStatus, Prisma } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { paginate } from '../common/helpers/paginate.helper';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private config: ConfigService,
    private eventsGateway: EventsGateway,
  ) { }

  // ─── Customer: Checkout ──────────────────────────────────
  async checkout(customerId: number, dto: CheckoutOrderDto) {
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // 1. Load semua menu yang dipesan
          const menuIds = dto.items.map((i) => i.menuId);
          const menus = await tx.menu.findMany({
            where: { id: { in: menuIds } },
            include: { vendor: true },
          });

          // 2. Validasi: semua menu harus ada
          if (menus.length !== menuIds.length) {
            throw new BadRequestException('Satu atau lebih menu tidak ditemukan');
          }

          // 3. Validasi: semua menu harus dari 1 vendor
          const vendorIds = [...new Set(menus.map((m) => m.vendorId))];
          if (vendorIds.length > 1) {
            throw new BadRequestException(
              'Semua item harus dari vendor yang sama',
            );
          }
          const vendorId = vendorIds[0];

          // 4. Validasi: vendor harus aktif
          const vendor = menus[0].vendor;
          if (!vendor.isActive) {
            throw new BadRequestException('Vendor sedang tidak aktif');
          }

          // 5. Validasi stok & availability per item
          for (const item of dto.items) {
            const menu = menus.find((m) => m.id === item.menuId)!;
            if (!menu.isAvailable) {
              throw new BadRequestException(`Menu "${menu.name}" sedang tidak tersedia`);
            }
            if (menu.stock < item.quantity) {
              throw new BadRequestException(
                `Stok "${menu.name}" tidak cukup. Tersisa: ${menu.stock}`,
              );
            }
          }

          // 6. Hitung fee dan total
          const subtotal = dto.items.reduce((sum, item) => {
            const menu = menus.find((m) => m.id === item.menuId)!;
            return sum + Number(menu.price) * item.quantity;
          }, 0);

          // Fee hanya untuk ONLINE — customer yang menanggung
          const feePercent = this.config.get<number>('QRIS_SERVICE_FEE_PERCENT') ?? 5;
          const serviceFeeRate =
            dto.paymentMethod === 'ONLINE'
              ? new Prisma.Decimal(feePercent / 100)
              : new Prisma.Decimal(0);
          const platformFee =
            dto.paymentMethod === 'ONLINE'
              ? parseFloat((subtotal * (feePercent / 100)).toFixed(2))
              : 0;
          // Estimasi biaya Xendit ~0.7% — hanya untuk rekonsiliasi internal
          const serviceFee =
            dto.paymentMethod === 'ONLINE'
              ? parseFloat((subtotal * 0.007).toFixed(2))
              : 0;
          const totalAmount = parseFloat((subtotal + platformFee).toFixed(2));

          // 7. Generate order code
          const orderCode = await generateOrderCode(tx);

          // 8. Buat Order (dengan fee fields)
          const order = await tx.order.create({
            data: {
              orderCode,
              customerId,
              vendorId,
              subtotal,
              notes: dto.notes,
              paymentMethod: dto.paymentMethod,
              serviceFeeRate,
              platformFee,
              serviceFee,
              totalAmount,
              orderItems: {
                create: dto.items.map((item) => {
                  const menu = menus.find((m) => m.id === item.menuId)!;
                  return {
                    menuId: item.menuId,
                    menuNameSnapshot: menu.name,
                    priceSnapshot: menu.price,
                    quantity: item.quantity,
                    subtotal: Number(menu.price) * item.quantity,
                  };
                }),
              },
            },
            include: { orderItems: true },
          });

          // 9. Decrement stok
          for (const item of dto.items) {
            await tx.menu.update({
              where: { id: item.menuId },
              data: { stock: { decrement: item.quantity } },
            });
          }

          // 10. Initiate payment — pakai totalAmount (sudah include fee untuk ONLINE)
          const customer = await tx.user.findUnique({
            where: { id: customerId },
            select: { email: true },
          });

          const paymentResult = await this.paymentService.initiate(
            dto.paymentMethod,
            {
              id: order.id,
              orderCode: order.orderCode,
              totalAmount,             // customer bayar ini
              customerEmail: customer!.email,
            },
          );

          // 11. Update payment status
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: paymentResult.paymentStatus,
              paymentReference: paymentResult.paymentReference,
            },
          });

          // Notifikasi vendor (Hanya kirim notif Real-time kalau pesanan Cash karena gausah tunggu bayar)
          if (dto.paymentMethod === 'CASH') {
            const vendorUserId = menus[0].vendor.userId; 
            this.eventsGateway.notifyVendorNewOrder(vendorUserId, order.id, totalAmount);
          }

          return {
            message: 'Order berhasil dibuat',
            data: {
              orderId: order.id,
              orderCode: order.orderCode,
              subtotal,
              platformFee,
              totalAmount,
              paymentMethod: dto.paymentMethod,
              paymentStatus: paymentResult.paymentStatus,
              ...(paymentResult.qrCodeUrl && {
                qrCodeUrl: paymentResult.qrCodeUrl,
              }),
            },
          }
        });
      } catch (error) {
        // Retry hanya untuk race condition order code (P2002 on orderCode)
        const isUniqueViolation =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002';

        if (isUniqueViolation && attempt < MAX_RETRIES) {
          const jitter = Math.random() * 50;
          await new Promise((r) => setTimeout(r, jitter));
          this.logger.warn(`Order code collision, retry attempt ${attempt + 1}`);
          continue;
        }

        throw error;
      }
    }
  }

  // ─── Customer: List orders ───────────────────────────────
  async listCustomerOrders(
    customerId: number,
    pagination: PaginationDto,
    status?: OrderStatus,
  ) {
    const { skip, page, limit } = pagination;
    const where = { customerId, ...(status && { status }) };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          vendor: { select: { id: true, canteenName: true, canteenNumber: true } },
          orderItems: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(orders, total, page!, limit!);
  }

  // ─── Customer: Detail order ──────────────────────────────
  async getCustomerOrder(customerId: number, orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendor: { select: { id: true, canteenName: true, canteenNumber: true } },
        orderItems: {
          include: { rating: true },
        },
      },
    });

    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.customerId !== customerId) {
      throw new ForbiddenException('Kamu tidak punya akses ke order ini');
    }

    return order;
  }

  // ─── Customer: Cancel order ──────────────────────────────
  async cancelOrder(customerId: number, orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.customerId !== customerId) {
      throw new ForbiddenException('Kamu tidak punya akses ke order ini');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Order hanya bisa dibatalkan saat status PENDING',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Restock
      for (const item of order.orderItems) {
        await tx.menu.update({
          where: { id: item.menuId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
      });
    });

    return { message: 'Order berhasil dibatalkan' };
  }

  // ─── Vendor: List orders ─────────────────────────────────
  async listVendorOrders(
    userId: number,
    pagination: PaginationDto,
    status?: OrderStatus,
  ) {
    const vendor = await this.getVendorProfile(userId);
    const { skip, page, limit } = pagination;
    const where = { vendorId: vendor.id, ...(status && { status }) };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, whatsappNumber: true },
          },
          orderItems: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(orders, total, page!, limit!);
  }

  // ─── Vendor: Detail order ────────────────────────────────
  async getVendorOrder(userId: number, orderId: number) {
    const vendor = await this.getVendorProfile(userId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: { id: true, name: true, email: true, whatsappNumber: true },
        },
        orderItems: true,
      },
    });

    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.vendorId !== vendor.id) {
      throw new ForbiddenException('Kamu tidak punya akses ke order ini');
    }

    return order;
  }

  // ─── Vendor: Accept ──────────────────────────────────────
  async acceptOrder(userId: number, orderId: number) {
    const order = await this.getVendorOwnedOrder(userId, orderId);
    this.assertStatus(order.status, OrderStatus.PENDING, 'accept');

    if (order.paymentMethod === 'ONLINE' && order.paymentStatus !== 'PAID') {
      throw new BadRequestException(
        'Order ONLINE belum dibayar — tidak bisa diterima sebelum pembayaran terkonfirmasi',
      );
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.ACCEPTED, acceptedAt: new Date() },
    });

    // Kirim notifikasi real-time ke customer
    this.eventsGateway.notifyCustomerOrderUpdate(
      order.customerId,
      orderId,
      OrderStatus.ACCEPTED,
    );

    return { message: 'Order diterima' };
  }

  // ─── Vendor: Reject ──────────────────────────────────────
  async rejectOrder(userId: number, orderId: number, dto: RejectOrderDto) {
    const order = await this.getVendorOwnedOrder(userId, orderId);
    this.assertStatus(order.status, OrderStatus.PENDING, 'reject');

    await this.prisma.$transaction(async (tx) => {
      // Restock
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        await tx.menu.update({
          where: { id: item.menuId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.REJECTED,
          rejectionReason: dto.reason,
          cancelledAt: new Date(),
        },
      });
    });

    // Kirim notifikasi real-time ke customer disertai alasan
    this.eventsGateway.notifyCustomerOrderUpdate(
      order.customerId,
      orderId,
      OrderStatus.REJECTED,
      dto.reason,
    );

    return { message: 'Order ditolak' };
  }

  // ─── Vendor: Ready ───────────────────────────────────────
  async readyOrder(userId: number, orderId: number) {
    const order = await this.getVendorOwnedOrder(userId, orderId);
    this.assertStatus(order.status, OrderStatus.ACCEPTED, 'ready');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.READY, readyAt: new Date() },
    });

    // Kirim notifikasi real-time ke customer
    this.eventsGateway.notifyCustomerOrderUpdate(
      order.customerId,
      orderId,
      OrderStatus.READY,
    );

    return { message: 'Order siap diambil' };
  }

  // ─── Vendor: Complete ────────────────────────────────────
  async completeOrder(userId: number, orderId: number) {
    const order = await this.getVendorOwnedOrder(userId, orderId);
    this.assertStatus(order.status, OrderStatus.READY, 'complete');

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
        // Cash: mark as PAID saat vendor complete
        ...(order.paymentMethod === 'CASH' && { paymentStatus: 'PAID' }),
      },
    });

    // Kirim notifikasi real-time ke customer
    this.eventsGateway.notifyCustomerOrderUpdate(
      order.customerId,
      orderId,
      OrderStatus.COMPLETED,
    );

    return { message: 'Order selesai' };
  }

  // ─── Helpers ─────────────────────────────────────────────
  private async getVendorProfile(userId: number) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profil vendor tidak ditemukan');
    return profile;
  }

  private async getVendorOwnedOrder(userId: number, orderId: number) {
    const vendor = await this.getVendorProfile(userId);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order tidak ditemukan');
    if (order.vendorId !== vendor.id) {
      throw new ForbiddenException('Kamu tidak punya akses ke order ini');
    }
    return order;
  }

  private assertStatus(
    current: OrderStatus,
    expected: OrderStatus,
    action: string,
  ) {
    if (current !== expected) {
      throw new BadRequestException(
        `Tidak bisa ${action} order dengan status ${current}. Status harus ${expected}`,
      );
    }
  }
}