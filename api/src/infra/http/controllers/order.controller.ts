import { FastifyReply, FastifyRequest } from 'fastify'
import { CreateOrderInput } from '../../../application/dtos/create-order-input'
import { CreateOrderUseCase } from '../../../application/use-cases/create-order'
import { FindOrderByIdUseCase } from '../../../application/use-cases/find-order-by-id'
import { Order } from '../../../domain/orders/order'
import { ordersPublishedTotal } from '../../observability/metrics'

export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly findOrderByIdUseCase: FindOrderByIdUseCase
  ) {}

  async create(
    request: FastifyRequest<{ Body: CreateOrderInput }>,
    reply: FastifyReply
  ) {
    const order = await this.createOrderUseCase.execute(request.body)

    ordersPublishedTotal.inc({ source: order.source })

    return reply.status(201).send(this.toResponse(order))
  }

  async findById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const order = await this.findOrderByIdUseCase.execute(request.params.id)

    if (!order) {
      return reply.status(404).send({ error: 'OrderNotFound' })
    }

    return reply.send(this.toResponse(order))
  }

  private toResponse(order: Order) {
    return {
      id: order.id,
      customerId: order.customerId,
      items: order.items,
      totalAmount: order.totalAmount,
      source: order.source,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }
  }
}
