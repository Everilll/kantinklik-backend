import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { paginate } from '../common/helpers/paginate.helper';

const RATING_WINDOW_DAYS = 7;

@Injectable()
export class RatingService {
  constructor(private prisma: PrismaService) {}

  // ─── Buat rating ─────────────────────────────────────────
  async createRating(customerId: number, dto: CreateRatingDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Cek orderItem ada
      const orderItem = await tx.orderItem.findUnique({
        where: { id: dto.orderItemId },
        include: { order: true },
      });
      if (!orderItem) throw new NotFoundException('Order item tidak ditemukan');

      // 2. Cek ownership — order harus milik customer ini
      if (orderItem.order.customerId !== customerId) {
        throw new ForbiddenException('Kamu tidak punya akses ke order item ini');
      }

      // 3. Cek order status harus COMPLETED
      if (orderItem.order.status !== 'COMPLETED') {
        throw new BadRequestException(
          'Rating hanya bisa diberikan setelah order COMPLETED',
        );
      }

      // 4. Cek 7-day window dari completedAt
      const completedAt = orderItem.order.completedAt;
      if (!completedAt) {
        throw new BadRequestException('Order belum selesai');
      }

      const daysDiff =
        (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > RATING_WINDOW_DAYS) {
        throw new BadRequestException(
          `Rating hanya bisa diberikan dalam ${RATING_WINDOW_DAYS} hari setelah order selesai`,
        );
      }

      // 5. Cek belum pernah rating (juga di-enforce UNIQUE di DB)
      const existing = await tx.rating.findUnique({
        where: { orderItemId: dto.orderItemId },
      });
      if (existing) {
        throw new BadRequestException('Kamu sudah memberikan rating untuk item ini');
      }

      // 6. Ambil menuId & vendorId dari menu
      const menu = await tx.menu.findUnique({
        where: { id: orderItem.menuId },
        select: { id: true, vendorId: true },
      });
      if (!menu) throw new NotFoundException('Menu tidak ditemukan');

      // 7. Insert rating
      const rating = await tx.rating.create({
        data: {
          orderItemId: dto.orderItemId,
          customerId,
          menuId: menu.id,
          vendorId: menu.vendorId,
          stars: dto.stars,
          review: dto.review,
        },
      });

      // 8. Recompute avgRating & ratingCount di Menu
      const agg = await tx.rating.aggregate({
        where: { menuId: menu.id },
        _avg: { stars: true },
        _count: true,
      });

      await tx.menu.update({
        where: { id: menu.id },
        data: {
          avgRating: Number((agg._avg.stars ?? 0).toFixed(2)),
          ratingCount: agg._count,
        },
      });

      return { message: 'Rating berhasil diberikan', data: rating };
    });
  }

  // ─── List rating per menu ─────────────────────────────────
  async getMenuRatings(menuId: number, pagination: PaginationDto) {
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } });
    if (!menu) throw new NotFoundException('Menu tidak ditemukan');

    const { skip, page, limit } = pagination;
    const where = { menuId };

    const [ratings, total] = await this.prisma.$transaction([
      this.prisma.rating.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rating.count({ where }),
    ]);

    return paginate(ratings, total, page!, limit!);
  }

  // ─── List rating per vendor ───────────────────────────────
  async getVendorRatings(vendorId: number, pagination: PaginationDto) {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) throw new NotFoundException('Vendor tidak ditemukan');

    const { skip, page, limit } = pagination;
    const where = { vendorId };

    // Hitung avg real-time
    const agg = await this.prisma.rating.aggregate({
      where,
      _avg: { stars: true },
      _count: true,
    });

    const [ratings, total] = await this.prisma.$transaction([
      this.prisma.rating.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          menu: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rating.count({ where }),
    ]);

    return {
      avgRating: Number((agg._avg.stars ?? 0).toFixed(2)),
      totalRatings: agg._count,
      ...paginate(ratings, total, page!, limit!),
    };
  }
}