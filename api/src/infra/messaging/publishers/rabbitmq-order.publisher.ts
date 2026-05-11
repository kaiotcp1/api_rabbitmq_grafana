import {
  OrderMessage,
  OrderPublisher,
} from '../../../application/contracts/messaging/order-publisher'
import { EXCHANGE, ROUTING_KEY, getChannel } from '../rabbitmq'

export class RabbitMQOrderPublisher implements OrderPublisher {
  async publish(message: OrderMessage): Promise<void> {
    const channel = getChannel()

    const wasPublished = channel.publish(
      EXCHANGE,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: message.orderId,
        timestamp: Date.now(),
      }
    )

    if (!wasPublished) {
      console.warn('[RabbitMQ] Publish retornou false: buffer interno cheio')
    }
  }
}
