import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import { AdminService } from './admin.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ImageFilePipe } from '../upload/pipes/image-file.pipe';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ─── Vendor ──────────────────────────────────────────────

  @Get('vendors')
  @ApiOperation({ summary: 'List semua vendor' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  listVendors(@Query('isActive') isActive?: string) {
    const filter =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.adminService.listVendors(filter);
  }

  @Post('vendors')
  @ApiOperation({ summary: 'Buat akun vendor baru' })
  createVendor(@Body() dto: CreateVendorDto) {
    return this.adminService.createVendor(dto);
  }

  @Patch('vendors/:id')
  @ApiOperation({ summary: 'Update data vendor' })
  updateVendor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.adminService.updateVendor(id, dto);
  }

  @Delete('vendors/:id')
  @ApiOperation({ summary: 'Nonaktifkan vendor (soft delete)' })
  deactivateVendor(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deactivateVendor(id);
  }

  @Post('vendors/:id/logo')
  @ApiOperation({ summary: 'Upload logo vendor' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(new ImageFilePipe()) file: Express.Multer.File,
  ) {
    return this.adminService.uploadVendorLogo(id, file);
  }

  // ─── Customer ────────────────────────────────────────────

  @Get('customers')
  @ApiOperation({ summary: 'List semua customer' })
  @ApiQuery({ name: 'search', required: false })
  listCustomers(@Query('search') search?: string) {
    return this.adminService.listCustomers(search);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Detail customer' })
  getCustomer(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getCustomer(id);
  }

  @Patch('customers/:id/verify')
  @ApiOperation({ summary: 'Toggle verifikasi customer (manual override)' })
  toggleVerify(
    @Param('id', ParseIntPipe) id: number,
    @Body('isVerified') isVerified: boolean,
  ) {
    return this.adminService.toggleCustomerVerified(id, isVerified);
  }
}