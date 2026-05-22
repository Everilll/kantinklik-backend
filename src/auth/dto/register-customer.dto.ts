import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterCustomerDto {
  @ApiProperty({ example: 'budi@student.smktelkom-mlg.sch.id' })
  @IsEmail()
  @Matches(/@student\.smktelkom-mlg\.sch\.id$/, {
    message: 'Email harus menggunakan domain @student.smktelkom-mlg.sch.id',
  })
  email: string;

  @ApiProperty({ example: 'Budi Santoso' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '081234567890' })
  @IsString()
  @Matches(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, {
    message: 'Format nomor WhatsApp tidak valid',
  })
  whatsappNumber: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;
}