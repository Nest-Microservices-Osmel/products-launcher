import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { NatsModule } from './transports/nats.module';

@Module({
  controllers: [OrdersController],
  providers: [],
  imports: [NatsModule]
})
export class OrdersModule {}
