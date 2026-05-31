import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { RatingModule } from './rating/rating.module';
import { UserModule } from './user/user.module';
import { WebhookModule } from './webhook/webhook.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskModule } from './task/task.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    PrismaModule, 
    ConfigModule,
    ScheduleModule.forRoot(),
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
    PaymentModule,
    RatingModule,
    UserModule,
    WebhookModule,
    TaskModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
