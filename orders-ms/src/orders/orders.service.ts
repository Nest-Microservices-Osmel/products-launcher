import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto, OrderItemDto, PaidOrderDto } from './dto';
import { firstValueFrom } from 'rxjs';
import { NATS_SERVICE } from 'src/config';
import { OrderWithProducts } from './interfaces/order-with-products.interface';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit{
  private readonly logger = new Logger('OrdersService');

  constructor(@Inject(NATS_SERVICE) private readonly productsClient: ClientProxy,) {
    super();
  }
  onModuleInit() {
    this.$connect();
    this.logger.log('Database connected');
  }
  async create(createOrderDto: CreateOrderDto) {
    try{
      const productIds = createOrderDto.item.map(item => item.productId)
      const products:any[] = await firstValueFrom(
        this.productsClient.send({cmd:'validate_product'},productIds)
      );
      const totalAmount = createOrderDto.item.reduce((acc,orderItem) => {
        const price = products.find(product => product.id === orderItem.productId).price
        return price * orderItem.quantity
      },0);
      const totalItem = createOrderDto.item.reduce((acc,orderItem) => {
        const price = products.find(product => product.id === orderItem.productId).price
        return acc + orderItem.quantity
      },0);


      const order = await this.order.create({
        data:{
          totalAmount: totalAmount,
          totalItems : totalItem,
          OrderItem: {
            createMany: {
              data: createOrderDto.item.map((orderItem)=>({
                 price: products.find(product => product.id === orderItem.productId
                 ).price,
                 productId: orderItem.productId,
                 quantity: orderItem.quantity
              }))
            }
          }
        },
        include: {
          OrderItem:{
            select:{
              price:true,
              quantity:true,
              productId:true
            }
          }
        }
      });
      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem)=>({
          ...orderItem,
          name: products.find(product=>product.id === orderItem.productId
          ).name
        }))
      };
    }catch(error){
       throw new RpcException(error)
    }

  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const {page,limit} = orderPaginationDto;
    const totalPages = await this.order.count({
      where: {
        status: orderPaginationDto.status
      }
    });
    const lastPage = Math.ceil(totalPages/limit);

    return {
      data:await this.order.findMany({
      skip:(page -1)*limit,
      take:limit,
      where: {
        status: orderPaginationDto.status
      }
      }),metadata:{
        total:totalPages,
        page:page,
        lastPage:lastPage
      }
    };
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where:{id},
      include:{
        OrderItem: {
          select:{
            price:true,
            quantity:true,
            productId:true
          }
        }
      }
    });
    if(!order){
      throw new RpcException({
        message:`Order with id #${id} not found!!`,
        status: HttpStatus.BAD_REQUEST
      });
    }

    const productIds = order.OrderItem.map(orderItem => orderItem.productId)
      const products:any[] = await firstValueFrom(
        this.productsClient.send({cmd:'validate_product'},productIds)
      );
    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem)=>({
        ...orderItem,
        name: products.find(product=>product.id === orderItem.productId
        ).name
      }))
    };
  }

  async chanceStatus(changeOrderStatusDto:ChangeOrderStatusDto){
   const {id,status} = changeOrderStatusDto;
   const order = await this.findOne(id);
   if (order.status === status){
    return order;
   }
   return this.order.update({
    where:{id},
    data:{
      status:status
    }
   })
  }


  async createPaymentSession(order: OrderWithProducts){
    const paymentSession = await firstValueFrom(
      this.productsClient.send('create.payment.session',{
        orderId: order.id,
        currency: 'usd',
        items: order.OrderItem.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      })
    );
    return paymentSession;
  }



  async paidOrder(paidOrderDto: PaidOrderDto){
    this.logger.log('Order Paid');
    this.logger.log(paidOrderDto);
    await this.order.update({
      where: {id:paidOrderDto.orderId},
      data: {
        status: 'PAID',
        paid: true,
        paidAt: new Date(),
        stripeChargeId: paidOrderDto.stripePaymentId,
        OrderReceipt: {
          create: {
            receiptUrl: paidOrderDto.receiptUrl
          }
        }
      }
    });

  }


}
