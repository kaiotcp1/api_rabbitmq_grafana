import amqplib, { Channel, ChannelModel } from 'amqplib'

export const EXCHANGE = 'orders'
export const ROUTING_KEY = 'orders.new'
export const QUEUE = 'orders.processing'
export const DLX = 'orders.dlx'
export const DLQ = 'orders.dead'

let connection: ChannelModel | null = null
let channel: Channel | null = null

export async function connectRabbitMQ(url: string): Promise<void> {
  if (connection && channel) {
    return
  }

  connection = await amqplib.connect(url)
  channel = await connection.createChannel()

  await channel.assertExchange(DLX, 'direct', { durable: true })
  await channel.assertQueue(DLQ, { durable: true })
  await channel.bindQueue(DLQ, DLX, 'dead')

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true })

  await channel.assertQueue(QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': DLX,
      'x-dead-letter-routing-key': 'dead',
    },
  })

  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY)

  console.log('[RabbitMQ] Conectado e topologia configurada')
}

export function getChannel(): Channel {
  if (!channel) {
    throw new Error('RabbitMQ nao inicializado')
  }

  return channel
}

export async function closeRabbitMQ(): Promise<void> {
  if (channel) {
    await channel.close()
    channel = null
  }

  if (connection) {
    await connection.close()
    connection = null
  }

  console.log('[RabbitMQ] Conexao fechada')
}
