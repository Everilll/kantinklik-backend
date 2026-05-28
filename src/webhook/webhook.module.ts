import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [WebhookController],
})
export class WebhookModule {}