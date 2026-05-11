import { closeMongoDB, connectMongoDB } from './infra/database/mongodb'
import {
  closeRabbitMQ,
  connectRabbitMQ,
  QUEUE,
} from './infra/messaging/rabbitmq'
import { startMetricsServer } from './infra/observability/metrics'
import { makeOrderConsumer } from './main/factories/make-order-consumer'

async function bootstrap() {
  await connectMongoDB(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/orders'
  )
  await connectRabbitMQ(process.env.RABBITMQ_URL || 'amqp://localhost:5672')

  const consumer = makeOrderConsumer()

  await consumer.start(QUEUE)
  startMetricsServer(Number(process.env.PROCESSOR_METRICS_PORT) || 9102)

  const shutdown = async () => {
    await closeRabbitMQ()
    await closeMongoDB()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

bootstrap().catch((error) => {
  console.error('[Processor] Erro ao iniciar processor:', error)
  process.exit(1)
})
