import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        whatsappNumber: true,
        role: true,
        isVerified: true,
        createdAt: true,
        vendorProfile: {
          select: {
            id: true,
            canteenNumber: true,
            canteenName: true,
            logoUrl: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }

  async updateMe(userId: number, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });

    return { message: 'Profil berhasil diupdate' };
  }
}