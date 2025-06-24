import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
 import { loadEnvFile } from './config/load-env';
loadEnvFile(); // Load environment variables from .env file

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
 


  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,   // 🔄 Enables @Transform() like .trim()
      whitelist: true,   // ✅ Automatically removes extra fields not in DTO
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
   console.log('✅ NODE_ENV:', process.env.NODE_ENV);
  console.log('Connected DB:', process.env.DB_URI_LOCAL);

}
bootstrap();

