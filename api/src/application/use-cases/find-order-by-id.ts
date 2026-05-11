import { Order } from '../../domain/orders/order'
import { FindOrderByIdRepository } from '../contracts/repositories/find-order-by-id.repository'

export class FindOrderByIdUseCase {
  constructor(private readonly findOrderByIdRepository: FindOrderByIdRepository) {}

  async execute(id: string): Promise<Order | null> {
    return this.findOrderByIdRepository.findById(id)
  }
}
