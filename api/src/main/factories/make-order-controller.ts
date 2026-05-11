import { CreateOrderUseCase } from '../../application/use-cases/create-order'
import { FindOrderByIdUseCase } from '../../application/use-cases/find-order-by-id'
import { MongoCreateOrderRepository } from '../../infra/database/repositories/mongo-create-order.repository'
import { MongoFindOrderByIdRepository } from '../../infra/database/repositories/mongo-find-order-by-id.repository'
import { getDatabase } from '../../infra/database/mongodb'
import { RabbitMQOrderPublisher } from '../../infra/messaging/publishers/rabbitmq-order.publisher'
import { OrderController } from '../../infra/http/controllers/order.controller'

export function makeOrderController(): OrderController {
  const database = getDatabase()

  const createOrderRepository = new MongoCreateOrderRepository(database)
  const findOrderByIdRepository = new MongoFindOrderByIdRepository(database)
  const orderPublisher = new RabbitMQOrderPublisher()

  const createOrderUseCase = new CreateOrderUseCase(
    createOrderRepository,
    orderPublisher
  )
  const findOrderByIdUseCase = new FindOrderByIdUseCase(findOrderByIdRepository)

  return new OrderController(createOrderUseCase, findOrderByIdUseCase)
}
