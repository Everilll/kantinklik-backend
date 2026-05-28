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
import { UploadModule } from './upload/upload.module';
import { AdminModule } from './admin/admin.module';
import { VendorModule } from './vendor/vendor.module';
import { MenuModule } from './menu/menu.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    PrismaModule, 
    ConfigModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    HashingModule,
    AuthModule,
    OtpModule,
    MailerModule,
    UploadModule,
    AdminModule,
    VendorModule,
    MenuModule,
    OrderModule,
    PaymentModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
