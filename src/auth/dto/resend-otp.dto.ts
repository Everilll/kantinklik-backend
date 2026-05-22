import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({ example: 'budi@student.smktelkom-mlg.sch.id' })
  @IsEmail()
  email: string;
}