import { OrderMessage } from '../../domain/orders/order-message'
import { ErpGateway } from '../contracts/gateways/erp.gateway'
import { UpdateOrderStatusRepository } from '../contracts/repositories/update-order-status.repository'

export class ProcessOrderUseCase {
  constructor(
    private readonly erpGateway: ErpGateway,
    private readonly updateOrderStatusRepository: UpdateOrderStatusRepository
  ) {}

  async execute(order: OrderMessage): Promise<void> {
    await this.erpGateway.sendOrder(order)
    await this.updateOrderStatusRepository.updateStatus(order.orderId, 'processed')
  }

  async markAsDeadLetter(orderId: string): Promise<void> {
    await this.updateOrderStatusRepository.updateStatus(orderId, 'dead_letter')
  }

  async markAsFailed(orderId: string): Promise<void> {
    await this.updateOrderStatusRepository.updateStatus(orderId, 'failed')
  }
}
