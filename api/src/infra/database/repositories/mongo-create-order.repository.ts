import { Collection, Db } from 'mongodb'
import { CreateOrderRepository } from '../../../application/contracts/repositories/create-order.repository'
import { AppError } from '../../../domain/errors/app-error'
import { Order } from '../../../domain/orders/order'
import {
  MongoOrderDocument,
  toDomainOrder,
} from '../mappers/mongo-order.mapper'

export class MongoCreateOrderRepository implements CreateOrderRepository {
  private collection: Collection<MongoOrderDocument>

  constructor(database: Db) {
    this.collection = database.collection<MongoOrderDocument>('orders')
  }

  async create(order: Omit<Order, 'id'>): Promise<Order> {
    const result = await this.collection.insertOne(order)

    if (!result.acknowledged) {
      throw new AppError('Failed to create order', 500)
    }

    return toDomainOrder({
      ...order,
      _id: result.insertedId,
    })
  }
}
