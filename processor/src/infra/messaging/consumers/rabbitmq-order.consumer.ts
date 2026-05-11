import { Channel, ConsumeMessage } from 'amqplib'
import { ProcessOrderUseCase } from '../../../application/use-cases/process-order'
import { OrderMessage } from '../../../domain/orders/order-message'
import {
  observeProcessingDuration,
  ordersFailedTotal,
  ordersProcessedTotal,
  ordersRetriedTotal,
} from '../../observability/metrics'
import { EXCHANGE, ROUTING_KEY } from '../rabbitmq'

export class RabbitMQOrderConsumer {
  constructor(
    private readonly channel: Channel,
    private readonly processOrderUseCase: ProcessOrderUseCase,
    private readonly maxAttempts: number
  ) {}

  async start(queue: string): Promise<void> {
    await this.channel.prefetch(1)

    await this.channel.consume(queue, async (message) => {
      if (!message) {
        return
      }

      await this.handleMessage(message)
    })

    console.log(`[Consumer] Aguardando mensagens na fila ${queue}`)
  }

  private async handleMessage(message: ConsumeMessage): Promise<void> {
    const startedAt = process.hrtime.bigint()
    const order = this.parseMessage(message)

    if (!order) {
      console.error('[Consumer] Payload invalido. Enviando mensagem para DLQ.')
      ordersFailedTotal.inc({ reason: 'invalid_payload' })
      observeProcessingDuration(
        'invalid_payload',
        'unknown',
        this.getDurationSeconds(startedAt)
      )
      this.channel.nack(message, false, false)
      return
    }

    console.log(
      `[Consumer] Processando pedido ${order.orderId} tentativa ${order.attempt}`
    )

    try {
      await this.processOrderUseCase.execute(order)
      this.channel.ack(message)
      ordersProcessedTotal.inc({ source: order.source })
      observeProcessingDuration(
        'success',
        order.source,
        this.getDurationSeconds(startedAt)
      )
      console.log(`[Consumer] Pedido ${order.orderId} processado com ack`)
    } catch (error) {
      await this.handleFailure(message, order, error as Error, startedAt)
    }
  }

  private parseMessage(message: ConsumeMessage): OrderMessage | null {
    try {
      const parsed = JSON.parse(message.content.toString()) as OrderMessage

      if (!parsed.orderId || !parsed.customerId || !Array.isArray(parsed.items)) {
        return null
      }

      return {
        ...parsed,
        attempt: parsed.attempt ?? 1,
      }
    } catch {
      return null
    }
  }

  private async handleFailure(
    message: ConsumeMessage,
    order: OrderMessage,
    error: Error,
    startedAt: bigint
  ): Promise<void> {
    console.error(
      `[Consumer] Falha no pedido ${order.orderId}: ${error.message}`
    )

    if (order.attempt < this.maxAttempts) {
      await this.processOrderUseCase.markAsFailed(order.orderId)
      this.publishRetry(order)
      this.channel.ack(message)
      ordersRetriedTotal.inc({ source: order.source })
      observeProcessingDuration(
        'retry',
        order.source,
        this.getDurationSeconds(startedAt)
      )

      console.log(
        `[Consumer] Retry publicado para ${order.orderId} tentativa ${
          order.attempt + 1
        }`
      )
      return
    }

    await this.processOrderUseCase.markAsDeadLetter(order.orderId)
    this.channel.nack(message, false, false)
    ordersFailedTotal.inc({ reason: 'max_attempts_exceeded' })
    observeProcessingDuration(
      'dead_letter',
      order.source,
      this.getDurationSeconds(startedAt)
    )

    console.error(
      `[Consumer] Pedido ${order.orderId} enviado para DLQ apos ${this.maxAttempts} tentativas`
    )
  }

  private publishRetry(order: OrderMessage): void {
    const retryMessage: OrderMessage = {
      ...order,
      attempt: order.attempt + 1,
    }

    const wasPublished = this.channel.publish(
      EXCHANGE,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(retryMessage)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: order.orderId,
        timestamp: Date.now(),
      }
    )

    if (!wasPublished) {
      console.warn('[RabbitMQ] Retry publicado com buffer interno cheio')
    }
  }

  private getDurationSeconds(startedAt: bigint): number {
    return Number(process.hrtime.bigint() - startedAt) / 1e9
  }
}
