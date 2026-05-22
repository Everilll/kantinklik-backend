import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import * as bcrypt from 'bcrypt';
import { OTP_LENGTH } from './otp.constants';

@Injectable()
export class OtpService {
  private readonly ttlMinutes: number;
  private readonly cooldownSeconds: number;
  private readonly maxPerHour: number;

  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
    private config: ConfigService,
  ) {
    this.ttlMinutes = this.config.get<number>('OTP_TTL_MINUTES') ?? 5;
    this.cooldownSeconds = this.config.get<number>('OTP_COOLDOWN_SECONDS') ?? 60;
    this.maxPerHour = this.config.get<number>('OTP_MAX_PER_HOUR') ?? 5;
  }

  // ─── Generate & kirim OTP ────────────────────────────────
  async issue(email: string, name: string, purpose = 'REGISTER'): Promise<Date> {
    await this.checkRateLimit(email);

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60 * 1000);

    await this.prisma.otpToken.create({
      data: { email, codeHash, purpose, expiresAt },
    });

    await this.updateRateLimit(email);
    await this.mailer.sendOtp(email, name, code, this.ttlMinutes);

    return expiresAt;
  }

  // ─── Verifikasi OTP ──────────────────────────────────────
  async verify(email: string, code: string, purpose = 'REGISTER'): Promise<void> {
    // Ambil token terbaru yang belum dikonsumsi dan belum expired
    const token = await this.prisma.otpToken.findFirst({
      where: {
        email,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) {
      throw new BadRequestException('Kode OTP tidak valid atau sudah expired');
    }

    const isMatch = await bcrypt.compare(code, token.codeHash);
    if (!isMatch) {
      throw new BadRequestException('Kode OTP salah');
    }

    // Mark sebagai consumed
    await this.prisma.otpToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });
  }

  // ─── Rate limit check ────────────────────────────────────
  private async checkRateLimit(email: string): Promise<void> {
    const now = new Date();
    const record = await this.prisma.otpRateLimit.findUnique({
      where: { email },
    });

    if (record) {
      // Cek cooldown (jarak dari request terakhir)
      const secondsSinceLast =
        (now.getTime() - record.lastRequestAt.getTime()) / 1000;
      if (secondsSinceLast < this.cooldownSeconds) {
        const remaining = Math.ceil(this.cooldownSeconds - secondsSinceLast);
        throw new BadRequestException(
          `Tunggu ${remaining} detik sebelum minta OTP lagi`,
        );
      }

      // Cek max per jam (sliding window 1 jam)
      const windowStart = new Date(now.getTime() - 60 * 60 * 1000);
      const isInSameWindow = record.windowStartAt > windowStart;

      if (isInSameWindow && record.requestsInWindow >= this.maxPerHour) {
        throw new BadRequestException(
          `Maksimal ${this.maxPerHour} OTP per jam. Coba lagi nanti`,
        );
      }
    }
  }

  private async updateRateLimit(email: string): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000);

    const existing = await this.prisma.otpRateLimit.findUnique({
      where: { email },
    });

    if (!existing || existing.windowStartAt < windowStart) {
      // Window baru — reset counter
      await this.prisma.otpRateLimit.upsert({
        where: { email },
        update: { requestsInWindow: 1, windowStartAt: now, lastRequestAt: now },
        create: { email, requestsInWindow: 1, windowStartAt: now, lastRequestAt: now },
      });
    } else {
      // Masih dalam window yang sama — increment
      await this.prisma.otpRateLimit.update({
        where: { email },
        data: {
          requestsInWindow: { increment: 1 },
          lastRequestAt: now,
        },
      });
    }
  }

  // ─── Helper ──────────────────────────────────────────────
  private generateCode(): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }
}