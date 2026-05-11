import { ProcessOrderUseCase } from '../../application/use-cases/process-order'
import { getDatabase } from '../../infra/database/mongodb'
import { MongoUpdateOrderStatusRepository } from '../../infra/database/repositories/mongo-update-order-status.repository'
import { SimulatedErpGateway } from '../../infra/gateways/simulated-erp.gateway'
import { RabbitMQOrderConsumer } from '../../infra/messaging/consumers/rabbitmq-order.consumer'
import { getChannel } from '../../infra/messaging/rabbitmq'

export function makeOrderConsumer(): RabbitMQOrderConsumer {
  const database = getDatabase()
  const failureRate = Number(process.env.ERP_FAILURE_RATE ?? 0.1)
  const maxAttempts = Number(process.env.PROCESSOR_MAX_ATTEMPTS ?? 3)

  const updateOrderStatusRepository = new MongoUpdateOrderStatusRepository(
    database
  )
  const erpGateway = new SimulatedErpGateway(failureRate)
  const processOrderUseCase = new ProcessOrderUseCase(
    erpGateway,
    updateOrderStatusRepository
  )

  return new RabbitMQOrderConsumer(
    getChannel(),
    processOrderUseCase,
    maxAttempts
  )
}
