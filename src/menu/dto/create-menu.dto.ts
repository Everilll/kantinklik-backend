import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMenuDto {
  @ApiProperty({ example: 1, description: 'ID kategori menu' })
  @IsInt()
  @IsPositive()
  categoryId: number;

  @ApiProperty({ example: 'Nasi Goreng Spesial' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Nasi goreng dengan telur dan ayam' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 12000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({ example: 20, description: 'Jumlah stok awal' })
  @IsInt()
  @Min(0)
  stock: number;
}