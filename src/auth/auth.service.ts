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
import { OTP_PURPOSE } from '../otp/otp.constants';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { HashingService } from '../common/hashing/hashing.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private hashingService: HashingService,
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
      const expiresAt = await this.otpService.issue(
        dto.email,
        existing.name,
        OTP_PURPOSE.REGISTER,
      );
      return {
        message: 'OTP dikirim ulang. Silakan cek email kamu',
        otpExpiresAt: expiresAt,
      };
    }

    const passwordHash = await this.hashingService.hash(dto.password);

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

    const expiresAt = await this.otpService.issue(
      user.email,
      user.name,
      OTP_PURPOSE.REGISTER,
    );

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

    await this.otpService.verify(email, code, OTP_PURPOSE.REGISTER);

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

    const expiresAt = await this.otpService.issue(
      email,
      user.name,
      OTP_PURPOSE.REGISTER,
    );

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

    const passwordMatch = await this.hashingService.compare(
      dto.password,
      user.passwordHash,
    );
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

  // ─── Forgot Password ─────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user?.isVerified) {
      await this.otpService.issue(email, user.name, OTP_PURPOSE.RESET_PASSWORD);
    }

    return {
      message:
        'Jika email terdaftar dan sudah diverifikasi, kode OTP untuk reset password telah dikirim',
    };
  }

  // ─── Reset Password ──────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException('Akun tidak ditemukan');

    if (!user.isVerified) {
      throw new BadRequestException(
        'Akun belum diverifikasi. Selesaikan verifikasi registrasi terlebih dahulu',
      );
    }

    await this.otpService.verify(
      dto.email,
      dto.otpCode,
      OTP_PURPOSE.RESET_PASSWORD,
    );

    const isSamePassword = await this.hashingService.compare(
      dto.newPassword,
      user.passwordHash,
    );
    if (isSamePassword) {
      throw new BadRequestException('Password baru harus berbeda dari password lama');
    }

    const hashedPassword = await this.hashingService.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password berhasil diubah. Silakan login kembali.' };
  }

  // ─── Helper ──────────────────────────────────────────────
  private generateToken(userId: number, email: string, role: string): string {
    return this.jwtService.sign({ sub: userId, email, role });
  }
}
