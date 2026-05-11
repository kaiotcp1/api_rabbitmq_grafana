import { Collection, Db, ObjectId } from 'mongodb'
import { FindOrderByIdRepository } from '../../../application/contracts/repositories/find-order-by-id.repository'
import { Order } from '../../../domain/orders/order'
import {
  MongoOrderDocument,
  toDomainOrder,
} from '../mappers/mongo-order.mapper'

export class MongoFindOrderByIdRepository implements FindOrderByIdRepository {
  private collection: Collection<MongoOrderDocument>

  constructor(database: Db) {
    this.collection = database.collection<MongoOrderDocument>('orders')
  }

  async findById(id: string): Promise<Order | null> {
    if (!ObjectId.isValid(id)) {
      return null
    }

    const order = await this.collection.findOne({ _id: new ObjectId(id) })

    return order ? toDomainOrder(order) : null
  }
}
