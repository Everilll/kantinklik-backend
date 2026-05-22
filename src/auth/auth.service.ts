import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from '../otp/otp.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { RegisterCustomerDto } from './dto/register-customer.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
  ) {}

  // ─── Register Customer ───────────────────────────────────
  async registerCustomer(dto: RegisterCustomerDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      if (existing.isVerified) {
        throw new ConflictException('Email sudah terdaftar');
      }
      // Sudah daftar tapi belum verifikasi — kirim ulang OTP
      const expiresAt = await this.otpService.issue(
        dto.email,
        existing.name,
        'REGISTER',
      );
      return {
        message: 'OTP dikirim ulang. Silakan cek email kamu',
        otpExpiresAt: expiresAt,
      };
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        whatsappNumber: dto.whatsappNumber,
        passwordHash,
        role: 'CUSTOMER',
        isVerified: false,
      },
    });

    const expiresAt = await this.otpService.issue(user.email, user.name, 'REGISTER');

    return {
      message: 'Registrasi berhasil. Silakan cek email untuk kode OTP',
      otpExpiresAt: expiresAt,
    };
  }

  // ─── Verify OTP ──────────────────────────────────────────
  async verifyOtp(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Email tidak ditemukan');
    if (user.isVerified) throw new BadRequestException('Akun sudah terverifikasi');

    await this.otpService.verify(email, code, 'REGISTER');

    await this.prisma.user.update({
      where: { email },
      data: { isVerified: true },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      message: 'Verifikasi berhasil',
      data: {
        accessToken: token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    };
  }

  // ─── Resend OTP ──────────────────────────────────────────
  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Email tidak ditemukan');
    if (user.isVerified) throw new BadRequestException('Akun sudah terverifikasi');

    const expiresAt = await this.otpService.issue(email, user.name, 'REGISTER');

    return {
      message: 'OTP berhasil dikirim ulang',
      otpExpiresAt: expiresAt,
    };
  }

  // ─── Login (universal: customer / vendor / admin) ────────
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { vendorProfile: { select: { id: true, canteenNumber: true } } },
    });

    if (!user) throw new UnauthorizedException('Email atau password salah');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Email atau password salah');

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Akun belum diverifikasi. Silakan cek email untuk kode OTP',
      );
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      message: 'Login berhasil',
      data: {
        accessToken: token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          vendorProfileId: user.vendorProfile?.id ?? null,
        },
      },
    };
  }

  // ─── Helper ──────────────────────────────────────────────
  private generateToken(userId: number, email: string, role: string): string {
    return this.jwtService.sign({ sub: userId, email, role });
  }
}