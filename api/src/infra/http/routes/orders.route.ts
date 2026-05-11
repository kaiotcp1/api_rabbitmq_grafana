import { FastifyInstance } from 'fastify'
import { CreateOrderInput } from '../../../application/dtos/create-order-input'
import { makeOrderController } from '../../../main/factories/make-order-controller'
import { CreateOrderSchema } from '../schemas/order.schema'

export async function orderRoutes(app: FastifyInstance) {
  const orderController = makeOrderController()

  app.post<{ Body: CreateOrderInput }>(
    '/orders',
    {
      schema: {
        body: CreateOrderSchema,
      },
    },
    orderController.create.bind(orderController)
  )

  app.get<{ Params: { id: string } }>(
    '/orders/:id',
    orderController.findById.bind(orderController)
  )
}
