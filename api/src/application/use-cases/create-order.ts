import { Order } from '../../domain/orders/order'
import { CreateOrderInput } from '../dtos/create-order-input'
import { OrderPublisher } from '../contracts/messaging/order-publisher'
import { CreateOrderRepository } from '../contracts/repositories/create-order.repository'

export class CreateOrderUseCase {
  constructor(
    private readonly createOrderRepository: CreateOrderRepository,
    private readonly orderPublisher: OrderPublisher
  ) {}

  async execute(order: CreateOrderInput): Promise<Order> {
    const timeNow = new Date()
    const totalAmount = order.items.reduce(
      (total, item) => total + item.price * item.qty,
      0
    )

    const orderData = await this.createOrderRepository.create({
      customerId: order.customerId,
      items: order.items,
      totalAmount,
      source: order.source,
      status: 'pending',
      createdAt: timeNow,
      updatedAt: timeNow,
    })

    await this.orderPublisher.publish({
      orderId: orderData.id!,
      customerId: orderData.customerId,
      items: orderData.items,
      totalAmount: orderData.totalAmount,
      source: orderData.source,
      createdAt: orderData.createdAt.toISOString(),
      attempt: 1,
    })

    return orderData
  }
}
