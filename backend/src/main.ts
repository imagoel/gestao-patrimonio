import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(new AppValidationPipe());

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port, '0.0.0.0');
}

bootstrap();
