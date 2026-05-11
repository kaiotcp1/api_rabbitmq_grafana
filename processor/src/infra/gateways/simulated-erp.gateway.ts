import { ErpGateway } from '../../application/contracts/gateways/erp.gateway'
import { OrderMessage } from '../../domain/orders/order-message'

export class SimulatedErpGateway implements ErpGateway {
  constructor(private readonly failureRate: number) {}

  async sendOrder(order: OrderMessage): Promise<void> {
    console.log(`[ERP] Enviando pedido ${order.orderId} para ERP simulado`)

    await new Promise((resolve) => setTimeout(resolve, 150))

    const hasForcedFailure = order.items.some((item) =>
      item.sku.toUpperCase().startsWith('FAIL')
    )

    if (
      hasForcedFailure ||
      order.customerId.toLowerCase().startsWith('fail') ||
      Math.random() < this.failureRate
    ) {
      throw new Error('ERP simulado indisponivel')
    }

    console.log(`[ERP] Pedido ${order.orderId} integrado com sucesso`)
  }
}
