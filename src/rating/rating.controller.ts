import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingController {
  constructor(private ratingService: RatingService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Beri rating pada order item (setelah COMPLETED, max 7 hari)' })
  createRating(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingService.createRating(user.id, dto);
  }

  @Get('menu/:menuId')
  @ApiOperation({ summary: 'List rating menu tertentu' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMenuRatings(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.ratingService.getMenuRatings(menuId, pagination);
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'List rating vendor + computed avgRating' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getVendorRatings(
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.ratingService.getVendorRatings(vendorId, pagination);
  }
}