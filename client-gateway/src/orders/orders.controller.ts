import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, Inject } from '@nestjs/common';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { firstValueFrom, Observable } from 'rxjs';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { CreateOrderDto } from './dto/create-order.dto';
import { StatusDto } from './dto';

@Controller('orders')
export class OrdersController {
  constructor(@Inject(NATS_SERVICE) private readonly ordersClient: ClientProxy,) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersClient.send('createOrder',createOrderDto);
  }

  @Get()
  async findAll(@Query() orderPaginationDto: OrderPaginationDto) {
    try {
      const orders =  await firstValueFrom(this.ordersClient.send('findAllOrders',orderPaginationDto))
      return orders
    } catch (error) {
      throw new RpcException(error)
    }

  }

  @Get('id/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try{
      const order = await firstValueFrom(this.ordersClient.send('findOneOrder',{id}))
      return order;
    }catch(error){
      throw new RpcException(error)
    }
  }


  @Patch(':id')
  async changeStatus(@Param('id') id: string, @Body() statusDto: StatusDto) {
    try{
      return this.ordersClient.send('changeOrderStatus',{id, statusDto});
    }catch(error){
      throw new RpcException(error)
    }
  }

}


