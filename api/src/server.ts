import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import { closeMongoDB, connectMongoDB } from './infra/database/mongodb'
import { closeRabbitMQ, connectRabbitMQ } from './infra/messaging/rabbitmq'
import { registerErrorHandler } from './infra/http/error-handler'
import { registerMetricsHook } from './infra/http/metrics-hook'
import { orderRoutes } from './infra/http/routes/orders.route'
import { startMetricsServer } from './infra/observability/metrics'

async function startServer() {
  await connectMongoDB(process.env.MONGODB_URI || 'mongodb://localhost:27017/order-api')
  await connectRabbitMQ(process.env.RABBITMQ_URL || 'amqp://localhost:5672')

  const app = Fastify({
    logger: true,
  })

  registerErrorHandler(app)
  registerMetricsHook(app)

  app.get('/health', async (_request: FastifyRequest, _reply: FastifyReply) => {
    return {
      status: 'ok',
      service: 'API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    }
  })

  await app.register(orderRoutes, { prefix: '/api/v1' })

  const shutdown = async () => {
    await app.close()
    await closeRabbitMQ()
    await closeMongoDB()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  await app.listen({
    port: Number(process.env.API_PORT) || 3001,
    host: '0.0.0.0',
  })

  startMetricsServer(Number(process.env.API_METRICS_PORT) || 9101)
}

startServer().catch((err) => {
  console.error('Error starting server:', err)
  process.exit(1)
})
