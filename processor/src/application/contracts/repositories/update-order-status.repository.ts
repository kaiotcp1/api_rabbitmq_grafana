import { OrderStatus } from '../../../domain/orders/order'

export interface UpdateOrderStatusRepository {
  updateStatus(orderId: string, status: OrderStatus): Promise<void>
}
