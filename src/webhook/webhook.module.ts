import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, ConfigModule, EventsModule],
  controllers: [WebhookController],
})
export class WebhookModule {}