import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Budi Santoso' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: '081234567890' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, {
    message: 'Format nomor WhatsApp tidak valid',
  })
  whatsappNumber?: string;
}