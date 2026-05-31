import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { HashingService } from '../common/hashing/hashing.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { paginate } from '../common/helpers/paginate.helper';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private upload: UploadService,
    private hashingService: HashingService,
  ) {}

  // ─── Vendor ──────────────────────────────────────────────

  async listVendors(pagination: PaginationDto, isActive?: boolean) {
    const { skip, page, limit } = pagination;
    const where = isActive !== undefined ? { isActive } : {};

    const [vendors, total] = await this.prisma.$transaction([
      this.prisma.vendorProfile.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true, whatsappNumber: true } },
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

  async createVendor(dto: CreateVendorDto) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) throw new ConflictException('Email sudah digunakan');

    const existingCanteen = await this.prisma.vendorProfile.findUnique({
      where: { canteenNumber: dto.canteenNumber },
    });
    if (existingCanteen) {
      throw new ConflictException(`Kantin ${dto.canteenNumber} sudah ada vendornya`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const vendor = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
          whatsappNumber: dto.whatsappNumber,
          role: 'VENDOR',
          isVerified: true,
        },
      });

      const profile = await tx.vendorProfile.create({
        data: {
          userId: user.id,
          canteenNumber: dto.canteenNumber,
          canteenName: dto.canteenName,
          description: dto.description,
        },
      });

      return { user, profile };
    });

    return {
      message: 'Vendor berhasil dibuat',
      data: {
        userId: vendor.user.id,
        email: vendor.user.email,
        name: vendor.user.name,
        canteenNumber: vendor.profile.canteenNumber,
        canteenName: vendor.profile.canteenName,
      },
    };
  }

  async updateVendor(vendorProfileId: number, dto: UpdateVendorDto) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!profile) throw new NotFoundException('Vendor tidak ditemukan');

    const { name, whatsappNumber, canteenName, canteenNumber, description, isActive } = dto;

    await this.prisma.$transaction(async (tx) => {
      if (name || whatsappNumber) {
        await tx.user.update({
          where: { id: profile.userId },
          data: { ...(name && { name }), ...(whatsappNumber && { whatsappNumber }) },
        });
      }
      await tx.vendorProfile.update({
        where: { id: vendorProfileId },
        data: {
          ...(canteenName && { canteenName }),
          ...(canteenNumber && { canteenNumber }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
        },
      });
    });

    return { message: 'Vendor berhasil diupdate' };
  }

  async deactivateVendor(vendorProfileId: number) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!profile) throw new NotFoundException('Vendor tidak ditemukan');

    await this.prisma.vendorProfile.update({
      where: { id: vendorProfileId },
      data: { isActive: false },
    });

    return { message: 'Vendor berhasil dinonaktifkan' };
  }

  async uploadVendorLogo(vendorProfileId: number, file: Express.Multer.File) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!profile) throw new NotFoundException('Vendor tidak ditemukan');

    const logoUrl = await this.upload.uploadImage(
      file.buffer,
      `vendors/${vendorProfileId}`,
    );

    await this.prisma.vendorProfile.update({
      where: { id: vendorProfileId },
      data: { logoUrl },
    });

    return { message: 'Logo berhasil diupload', data: { logoUrl } };
  }

  // ─── Customer ────────────────────────────────────────────

  async listCustomers(pagination: PaginationDto, search?: string) {
    const { skip, page, limit } = pagination;

    const where = {
      role: 'CUSTOMER' as const,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [customers, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          whatsappNumber: true,
          isVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(customers, total, page!, limit!);
  }

  async getCustomer(customerId: number) {
    const customer = await this.prisma.user.findFirst({
      where: { id: customerId, role: 'CUSTOMER' },
      select: {
        id: true,
        email: true,
        name: true,
        whatsappNumber: true,
        isVerified: true,
        createdAt: true,
        _count: { select: { ordersAsCustomer: true, ratings: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer tidak ditemukan');
    return customer;
  }

  async toggleCustomerVerified(customerId: number, isVerified: boolean) {
    const customer = await this.prisma.user.findFirst({
      where: { id: customerId, role: 'CUSTOMER' },
    });
    if (!customer) throw new NotFoundException('Customer tidak ditemukan');

    await this.prisma.user.update({
      where: { id: customerId },
      data: { isVerified },
    });

    return { message: `Customer berhasil di${isVerified ? '' : 'un'}verifikasi` };
  }

  async resetCustomerPassword(customerId: number, newPassword: string) {
    return this.resetUserPassword(customerId, 'CUSTOMER', newPassword);
  }

  async resetVendorPassword(vendorProfileId: number, newPassword: string) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
    });
    if (!profile) throw new NotFoundException('Vendor tidak ditemukan');

    return this.resetUserPassword(profile.userId, 'VENDOR', newPassword);
  }

  private async resetUserPassword(
    userId: number,
    expectedRole: 'CUSTOMER' | 'VENDOR',
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== expectedRole) {
      const label = expectedRole === 'CUSTOMER' ? 'Customer' : 'Vendor';
      throw new NotFoundException(`${label} tidak ditemukan`);
    }

    const passwordHash = await this.hashingService.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    return { message: 'Password berhasil direset' };
  }
}