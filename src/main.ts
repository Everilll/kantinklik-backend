import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Global prefix ───────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── CORS ────────────────────────────────────────────────
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  // ─── Global Validation Pipe ───────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // strip field yang tidak ada di DTO
      forbidNonWhitelisted: true,
      transform: true,        // auto-convert tipe (string → number, dll)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Swagger ──────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('KantinKlik API')
    .setDescription('Backend API untuk sistem kantin digital SMK Telkom Malang')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Masukkan JWT token dari response login',
      },
      'access-token'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

   // ─── Global Filter & Interceptor ─────────────────────────
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`App running on => http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();