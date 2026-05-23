import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({ example: 'vendor1@kantinklik.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Pak Budi' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '081234567890' })
  @IsString()
  @Matches(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, {
    message: 'Format nomor WhatsApp tidak valid',
  })
  whatsappNumber: string;

  @ApiProperty({ example: 1, description: 'Nomor kantin 1–12' })
  @IsInt()
  @Min(1)
  @Max(12)
  canteenNumber: number;

  @ApiProperty({ example: 'Kantin Barokah' })
  @IsString()
  @MinLength(2)
  canteenName: string;

  @ApiPropertyOptional({ example: 'Menyajikan makanan halal dan lezat' })
  @IsOptional()
  @IsString()
  description?: string;
}