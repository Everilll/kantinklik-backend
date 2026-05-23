import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ImageFilePipe } from '../upload/pipes/image-file.pipe';

@ApiTags('Menus')
@Controller()
export class MenuController {
  constructor(private menusService: MenuService) {}

  // ─── Public ──────────────────────────────────────────────

  @Get('menu-categories')
  @ApiOperation({ summary: 'List kategori menu (untuk dropdown)' })
  getCategories() {
    return this.menusService.getCategories();
  }

  // ─── Vendor ──────────────────────────────────────────────

  @Get('vendor/menus')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'List semua menu milik vendor' })
  listOwnMenus(@CurrentUser() user: { id: number }) {
    return this.menusService.listOwnMenus(user.id);
  }

  @Post('vendor/menus')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Tambah menu baru' })
  createMenu(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateMenuDto,
  ) {
    return this.menusService.createMenu(user.id, dto);
  }

  @Patch('vendor/menus/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Update menu (harga, stok, ketersediaan)' })
  updateMenu(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) menuId: number,
    @Body() dto: UpdateMenuDto,
  ) {
    return this.menusService.updateMenu(user.id, menuId, dto);
  }

  @Delete('vendor/menus/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Hapus menu (soft delete)' })
  deleteMenu(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) menuId: number,
  ) {
    return this.menusService.deleteMenu(user.id, menuId);
  }

  @Post('vendor/menus/:id/image')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Upload gambar menu' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadMenuImage(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) menuId: number,
    @UploadedFile(new ImageFilePipe()) file: Express.Multer.File,
  ) {
    return this.menusService.uploadMenuImage(user.id, menuId, file);
  }
}