import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({ example: 1, description: 'ID order item yang mau di-rating' })
  @IsInt()
  orderItemId: number;

  @ApiProperty({ example: 5, description: 'Bintang 1–5' })
  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;

  @ApiPropertyOptional({ example: 'Enak banget, porsinya besar!' })
  @IsOptional()
  @IsString()
  review?: string;
}