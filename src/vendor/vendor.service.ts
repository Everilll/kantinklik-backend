import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { paginate } from '../common/helpers/paginate.helper';

@Injectable()
export class VendorService {
  constructor(
    private prisma: PrismaService,
    private upload: UploadService,
  ) {}

  // ─── Public ──────────────────────────────────────────────

  async listVendors(pagination: PaginationDto, canteenNumber?: number) {
    const { skip, page, limit } = pagination;

    const where = {
      isActive: true,
      ...(canteenNumber && { canteenNumber }),
    };

    const [vendors, total] = await this.prisma.$transaction([
      this.prisma.vendorProfile.findMany({
        where,
        select: {
          id: true,
          canteenNumber: true,
          canteenName: true,
          description: true,
          logoUrl: true,
          _count: { select: { menus: true } },
        },
        orderBy: { canteenNumber: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorProfile.count({ where }),
    ]);

    return paginate(vendors, total, page!, limit!);
  }

  async getVendorDetail(vendorId: number) {
    const vendor = await this.prisma.vendorProfile.findFirst({
      where: { id: vendorId, isActive: true },
      select: {
        id: true,
        canteenNumber: true,
        canteenName: true,
        description: true,
        logoUrl: true,
        _count: { select: { menus: true } },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor tidak ditemukan');

    // Hitung avgRating vendor real-time dari semua rating menu-nya
    const ratingAgg = await this.prisma.rating.aggregate({
      where: { vendorId },
      _avg: { stars: true },
      _count: true,
    });

    return {
      ...vendor,
      menuCount: vendor._count.menus,
      avgRating: Number((ratingAgg._avg.stars ?? 0).toFixed(2)),
      totalRatings: ratingAgg._count,
    };
  }

  async getVendorMenus(
    vendorId: number,
    pagination: PaginationDto,
    categoryId?: number,
    isAvailable?: boolean,
  ) {
    const vendor = await this.prisma.vendorProfile.findFirst({
      where: { id: vendorId, isActive: true },
    });
    if (!vendor) throw new NotFoundException('Vendor tidak ditemukan');

    const { skip, page, limit } = pagination;

    const where = {
      vendorId,
      ...(categoryId && { categoryId }),
      ...(isAvailable !== undefined && { isAvailable }),
    };

    const [menus, total] = await this.prisma.$transaction([
      this.prisma.menu.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, type: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.menu.count({ where }),
    ]);

    return paginate(menus, total, page!, limit!);
  }

  // ─── Vendor Self ─────────────────────────────────────────

  async getSelfProfile(userId: number) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, name: true, whatsappNumber: true } },
      },
    });
    if (!profile) throw new NotFoundException('Profil vendor tidak ditemukan');
    return profile;
  }

  async updateSelfProfile(
    userId: number,
    dto: { canteenName?: string; description?: string },
  ) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profil vendor tidak ditemukan');

    await this.prisma.vendorProfile.update({
      where: { userId },
      data: dto,
    });

    return { message: 'Profil berhasil diupdate' };
  }

  async uploadSelfLogo(userId: number, file: Express.Multer.File) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profil vendor tidak ditemukan');

    const logoUrl = await this.upload.uploadImage(
      file.buffer,
      `vendors/${profile.id}`,
    );

    await this.prisma.vendorProfile.update({
      where: { userId },
      data: { logoUrl },
    });

    return { message: 'Logo berhasil diupload', data: { logoUrl } };
  }
}