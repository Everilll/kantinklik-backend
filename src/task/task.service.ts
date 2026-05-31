import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredOrders() {
    this.logger.debug('Menjalankan pengecekan order expired...');

    // Cari order yang pending, usianya lebih dari 30 menit
    const expirationTime = new Date(Date.now() - 30 * 60 * 1000);

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        // Kita includekan online yang belum bayar, atau cash yang tidak di-accept vendor
        createdAt: {
          lt: expirationTime,
        },
        OR: [
          { paymentStatus: PaymentStatus.UNPAID, paymentMethod: 'ONLINE' },
          { paymentStatus: PaymentStatus.UNPAID, paymentMethod: 'CASH' },
        ],
      },
      include: {
        orderItems: true,
      },
    });

    if (expiredOrders.length === 0) {
      return;
    }

    this.logger.log(`Ditemukan ${expiredOrders.length} order expired. Membatalkan order otomatis...`);

    for (const order of expiredOrders) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Kembalikan stok item ke tabel menu
          for (const item of order.orderItems) {
            await tx.menu.update({
              where: { id: item.menuId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
          }

          // Update status order menjadi CANCELLED
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.CANCELLED,
              cancelledAt: new Date(),
              rejectionReason: 'Batal otomatis oleh sistem karena melewati 30 menit tdk dibayar/diterima',
            },
          });
        });

        this.logger.log(`Order ${order.orderCode} berhasil dibatalkan otomatis.`);
      } catch (error) {
        this.logger.error(`Gagal mematalkan order ${order.orderCode}:`, error);
      }
    }
  }
}
