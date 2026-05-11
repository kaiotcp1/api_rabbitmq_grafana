import { Order } from '../../../domain/orders/order'

export interface CreateOrderRepository {
  create(order: Omit<Order, 'id'>): Promise<Order>
}
