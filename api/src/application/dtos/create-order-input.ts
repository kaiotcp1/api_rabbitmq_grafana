import { OrderItem, OrderSource } from '../../domain/orders/order'

export interface CreateOrderInput {
  customerId: string
  items: OrderItem[]
  source: OrderSource
}
