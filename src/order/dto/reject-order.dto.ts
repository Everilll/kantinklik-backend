import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectOrderDto {
  @ApiProperty({ example: 'Stok bahan habis' })
  @IsString()
  @MinLength(3)
  reason: string;
}