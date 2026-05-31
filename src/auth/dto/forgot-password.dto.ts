import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@student.smktelkom-mlg.sch.id' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
