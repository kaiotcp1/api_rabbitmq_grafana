import { OrderItem, OrderSource } from './order'

export interface OrderMessage {
  orderId: string
  customerId: string
  items: OrderItem[]
  totalAmount: number
  source: OrderSource
  createdAt: string
  attempt: number
}
