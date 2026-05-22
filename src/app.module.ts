import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { OtpModule } from './otp/otp.module';
import { MailerModule } from './mailer/mailer.module';
import { HashingModule } from './common/hashing/hashing.module';

@Module({
  imports: [PrismaModule, ConfigModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    HashingModule,
    AuthModule,
    OtpModule,
    MailerModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
