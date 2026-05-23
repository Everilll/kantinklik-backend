import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register-customer')
  @ApiOperation({ summary: 'Daftar akun customer baru' })
  @ApiResponse({ status: 201, description: 'OTP dikirim ke email' })
  @ApiResponse({ status: 409, description: 'Email sudah terdaftar' })
  registerCustomer(@Body() dto: RegisterCustomerDto) {
    return this.authService.registerCustomer(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifikasi OTP - aktivasi akun + dapat token' })
  @ApiResponse({ status: 200, description: 'Akun terverifikasi, return JWT' })
  @ApiResponse({ status: 400, description: 'OTP salah atau expired' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.code);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kirim ulang OTP' })
  @ApiResponse({ status: 200, description: 'OTP dikirim ulang' })
  @ApiResponse({ status: 429, description: 'Rate limit — tunggu sebelum request lagi' })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login - berlaku untuk customer, vendor, dan admin' })
  @ApiResponse({ status: 200, description: 'Login berhasil, return JWT' })
  @ApiResponse({ status: 401, description: 'Email atau password salah' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}