import { OrderMessage } from '../../../domain/orders/order-message'

export interface ErpGateway {
  sendOrder(order: OrderMessage): Promise<void>
}
