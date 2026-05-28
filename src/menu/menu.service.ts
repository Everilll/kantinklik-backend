import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { paginate } from '../common/helpers/paginate.helper';

@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    private upload: UploadService,
  ) {}

  private async getVendorProfile(userId: number) {
    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Profil vendor tidak ditemukan');
    return profile;
  }

  // ─── Public ──────────────────────────────────────────────

  async getCategories() {
    return this.prisma.menuCategory.findMany({ orderBy: { name: 'asc' } });
  }

  // ─── Vendor CRUD ─────────────────────────────────────────

  async listOwnMenus(userId: number, pagination: PaginationDto) {
    const profile = await this.getVendorProfile(userId);
    const { skip, page, limit } = pagination;

    const where = { vendorId: profile.id };

    const [menus, total] = await this.prisma.$transaction([
      this.prisma.menu.findMany({
        where,
        include: { category: { select: { id: true, name: true, type: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.menu.count({ where }),
    ]);

    return paginate(menus, total, page!, limit!);
  }

  async createMenu(userId: number, dto: CreateMenuDto) {
    const profile = await this.getVendorProfile(userId);

    const category = await this.prisma.menuCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    const menu = await this.prisma.menu.create({
      data: {
        vendorId: profile.id,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
      },
      include: { category: { select: { id: true, name: true, type: true } } },
    });

    return { message: 'Menu berhasil dibuat', data: menu };
  }

  async updateMenu(userId: number, menuId: number, dto: UpdateMenuDto) {
    await this.checkOwnership(userId, menuId);

    const menu = await this.prisma.menu.update({
      where: { id: menuId },
      data: dto,
      include: { category: { select: { id: true, name: true, type: true } } },
    });

    return { message: 'Menu berhasil diupdate', data: menu };
  }

  async deleteMenu(userId: number, menuId: number) {
    await this.checkOwnership(userId, menuId);

    await this.prisma.menu.update({
      where: { id: menuId },
      data: { isAvailable: false, stock: 0 },
    });

    return { message: 'Menu berhasil dihapus' };
  }

  async uploadMenuImage(userId: number, menuId: number, file: Express.Multer.File) {
    const menu = await this.checkOwnership(userId, menuId);

    const imageUrl = await this.upload.uploadImage(
      file.buffer,
      `menus/${menu.vendorId}`,
    );

    await this.prisma.menu.update({
      where: { id: menuId },
      data: { imageUrl },
    });

    return { message: 'Gambar menu berhasil diupload', data: { imageUrl } };
  }

  private async checkOwnership(userId: number, menuId: number) {
    const profile = await this.getVendorProfile(userId);
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } });
    if (!menu) throw new NotFoundException('Menu tidak ditemukan');
    if (menu.vendorId !== profile.id) {
      throw new ForbiddenException('Kamu tidak punya akses ke menu ini');
    }
    return menu;
  }
}