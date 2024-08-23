import { Controller, Logger, ParseUUIDPipe } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto, PaidOrderDto } from './dto';
import { OrderWithProducts } from './interfaces/order-with-products.interface';


@Controller()
export class OrdersController {
  private readonly logger = new Logger('findAllOrders');
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('createOrder')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    const paymentSession = await this.ordersService.createPaymentSession(order)
    return {
      order,
      paymentSession
    };
  }

  @MessagePattern('findAllOrders')
  findAll(@Payload()orderPaginationDto:OrderPaginationDto) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern('findOneOrder')
  findOne(@Payload('id',ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern('changeOrderStatus')
  changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
    return this.ordersService.chanceStatus(changeOrderStatusDto)
  }


  @EventPattern('payment.succeeded')
  payOrder(@Payload() paidOrderDto: PaidOrderDto){
    console.log({ paidOrderDto });
    return this.ordersService.paidOrder(paidOrderDto)
  }

}
