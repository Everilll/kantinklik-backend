import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@student.smktelkom-mlg.sch.id' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otpCode: string;

  @ApiProperty({ example: 'PasswordBaru123!' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
