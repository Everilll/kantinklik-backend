import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class VendorService {
  constructor(
    private prisma: PrismaService,
    private upload: UploadService,
  ) {}

  // ─── Public ──────────────────────────────────────────────

  async listVendors(canteenNumber?: number) {
    return this.prisma.vendorProfile.findMany({
      where: {
        isActive: true,
        ...(canteenNumber && { canteenNumber }),
      },
      select: {
        id: true,
        canteenNumber: true,
        canteenName: true,
        description: true,
        logoUrl: true,
        _count: { select: { menus: true } },
      },
      orderBy: { canteenNumber: 'asc' },
    });
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

    // Hitung avgRating vendor dari semua rating menu-nya
    const ratingAgg = await this.prisma.rating.aggregate({
      where: { vendorId },
      _avg: { stars: true },
      _count: true,
    });

    return {
      ...vendor,
      avgRating: ratingAgg._avg.stars ?? 0,
      totalRatings: ratingAgg._count,
    };
  }

  async getVendorMenus(vendorId: number, categoryId?: number, isAvailable?: boolean) {
    const vendor = await this.prisma.vendorProfile.findFirst({
      where: { id: vendorId, isActive: true },
    });
    if (!vendor) throw new NotFoundException('Vendor tidak ditemukan');

    return this.prisma.menu.findMany({
      where: {
        vendorId,
        ...(categoryId && { categoryId }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
      include: {
        category: { select: { id: true, name: true, type: true } },
      },
      orderBy: { name: 'asc' },
    });
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