import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { otpEmailTemplate } from './templates/otp-email';
import { OtpPurpose } from '../otp/otp.constants';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly isDev: boolean;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.fromEmail = this.config.get<string>('RESEND_FROM_EMAIL')!;
    this.isDev = this.config.get<string>('NODE_ENV') !== 'production';
  }

  async sendOtp(
    to: string,
    name: string,
    code: string,
    ttlMinutes: number,
    purpose: OtpPurpose = 'REGISTER',
  ): Promise<void> {
    const isReset = purpose === 'RESET_PASSWORD';
    const subject = isReset
      ? 'Reset Password KantinKlik'
      : 'Kode OTP KantinKlik';

    if (this.isDev) {
      this.logger.log(`[DEV MODE] OTP (${purpose}) untuk ${to}: ${code}`);
      return;
    }

    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html: otpEmailTemplate(name, code, ttlMinutes, purpose),
      });

      if (response.error) {
        this.logger.error(`Resend API Error: ${response.error.message}`, response.error);
      } else {
        this.logger.log(`OTP email terkirim ke ${to}`);
      }
    } catch (error) {
      // Log error tapi tidak throw — supaya flow register tidak berhenti total
      // kalau Resend down. Customer bisa pakai resend-otp endpoint
      this.logger.error(`Gagal kirim OTP ke ${to}:`, error);
    }
  }
}