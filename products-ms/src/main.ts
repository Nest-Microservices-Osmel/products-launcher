import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from './config/envs';
import { env } from 'process';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {

  console.log(envs.natsServers)
  const logger = new Logger('Main');
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule,
    {
      transport: Transport.NATS,
      options:{
        servers: envs.natsServers
      }
    }
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );
  await app.listen();
  logger.log(`Product Microservices running on Port ${envs.port}`);
}
bootstrap();
