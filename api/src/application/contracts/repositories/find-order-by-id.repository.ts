import { Order } from '../../../domain/orders/order'

export interface FindOrderByIdRepository {
  findById(id: string): Promise<Order | null>
}
