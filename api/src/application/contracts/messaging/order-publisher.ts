import { OrderItem, OrderSource } from '../../../domain/orders/order'

export interface OrderMessage {
  orderId: string
  customerId: string
  items: OrderItem[]
  totalAmount: number
  source: OrderSource
  createdAt: string
  attempt: number
}

export interface OrderPublisher {
  publish(message: OrderMessage): Promise<void>
}
