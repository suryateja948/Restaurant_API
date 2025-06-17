import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,   // 🔄 Enables @Transform() like .trim()
      whitelist: true,   // ✅ Automatically removes extra fields not in DTO
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

