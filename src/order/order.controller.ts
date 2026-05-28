import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OrderStatus, Role } from '@prisma/client';
import { OrderService } from './order.service';
import { CheckoutOrderDto } from './dto/checkout-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OrderController {
  constructor(private orderService: OrderService) {}

  // ─── Customer ────────────────────────────────────────────

  @Post('orders/checkout')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Checkout — buat order baru' })
  checkout(
    @CurrentUser() user: { id: number },
    @Body() dto: CheckoutOrderDto,
  ) {
    return this.orderService.checkout(user.id, dto);
  }

  @Get('orders/me')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'List order milik customer' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listMyOrders(
    @CurrentUser() user: { id: number },
    @Query() pagination: PaginationDto,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orderService.listCustomerOrders(user.id, pagination, status);
  }

  @Get('orders/:id')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Detail order customer' })
  getMyOrder(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.orderService.getCustomerOrder(user.id, orderId);
  }

  @Post('orders/:id/cancel')
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order (hanya saat PENDING)' })
  cancelOrder(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.orderService.cancelOrder(user.id, orderId);
  }

  // ─── Vendor Dashboard ────────────────────────────────────

  @Get('vendor/orders')
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'List order masuk ke vendor' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listVendorOrders(
    @CurrentUser() user: { id: number },
    @Query() pagination: PaginationDto,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orderService.listVendorOrders(user.id, pagination, status);
  }

  @Get('vendor/orders/:id')
  @Roles(Role.VENDOR)
  @ApiOperation({ summary: 'Detail order vendor' })
  getVendorOrder(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.orderService.getVendorOrder(user.id, orderId);
  }

  @Post('vendor/orders/:id/accept')
  @Roles(Role.VENDOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terima order (PENDING → ACCEPTED)' })
  acceptOrder(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.orderService.acceptOrder(user.id, orderId);
  }

  @Post('vendor/orders/:id/reject')
  @Roles(Role.VENDOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tolak order (PENDING → REJECTED)' })
  rejectOrder(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: RejectOrderDto,
  ) {
    return this.orderService.rejectOrder(user.id, orderId, dto);
  }

  @Post('vendor/orders/:id/ready')
  @Roles(Role.VENDOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Order siap diambil (ACCEPTED → READY)' })
  readyOrder(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.orderService.readyOrder(user.id, orderId);
  }

  @Post('vendor/orders/:id/complete')
  @Roles(Role.VENDOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Selesaikan order (READY → COMPLETED)' })
  completeOrder(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.orderService.completeOrder(user.id, orderId);
  }
}