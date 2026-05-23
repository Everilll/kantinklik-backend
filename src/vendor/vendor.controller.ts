import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
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
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { VendorService } from './vendor.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ImageFilePipe } from '../upload/pipes/image-file.pipe';

@ApiTags('Vendors')
@Controller()
export class VendorController {
  constructor(private vendorsService: VendorService) {}

  // ─── Public ──────────────────────────────────────────────

  @Get('vendors')
  @ApiOperation({ summary: 'List semua vendor aktif' })
  @ApiQuery({ name: 'canteenNumber', required: false, type: Number })
  listVendors(@Query('canteenNumber') canteenNumber?: string) {
    return this.vendorsService.listVendors(
      canteenNumber ? parseInt(canteenNumber) : undefined,
    );
  }

  @Get('vendors/:id')
  @ApiOperation({ summary: 'Detail vendor + avgRating + jumlah menu' })
  getVendorDetail(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.getVendorDetail(id);
  }

  @Get('vendors/:id/menus')
  @ApiOperation({ summary: 'List menu dari vendor tertentu' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean })
  getVendorMenus(
    @Param('id', ParseIntPipe) id: number,
    @Query('categoryId') categoryId?: string,
    @Query('isAvailable') isAvailable?: string,
  ) {
    return this.vendorsService.getVendorMenus(
      id,
      categoryId ? parseInt(categoryId) : undefined,
      isAvailable === 'true' ? true : isAvailable === 'false' ? false : undefined,
    );
  }

  // ─── Vendor Self ─────────────────────────────────────────

  @Get('vendor/profile')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Lihat profil vendor sendiri' })
  getSelfProfile(@CurrentUser() user: { id: number }) {
    return this.vendorsService.getSelfProfile(user.id);
  }

  @Patch('vendor/profile')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Update profil vendor sendiri' })
  updateSelfProfile(
    @CurrentUser() user: { id: number },
    @Body() dto: { canteenName?: string; description?: string },
  ) {
    return this.vendorsService.updateSelfProfile(user.id, dto);
  }

  @Post('vendor/logo')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Upload logo vendor sendiri' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(
    @CurrentUser() user: { id: number },
    @UploadedFile(new ImageFilePipe()) file: Express.Multer.File,
  ) {
    return this.vendorsService.uploadSelfLogo(user.id, file);
  }
}