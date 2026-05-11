import { Collection, Db, ObjectId } from 'mongodb'
import { UpdateOrderStatusRepository } from '../../../application/contracts/repositories/update-order-status.repository'
import { OrderStatus } from '../../../domain/orders/order'

interface MongoOrderDocument {
  _id?: ObjectId
  status: OrderStatus
  updatedAt: Date
}

export class MongoUpdateOrderStatusRepository
  implements UpdateOrderStatusRepository
{
  private collection: Collection<MongoOrderDocument>

  constructor(database: Db) {
    this.collection = database.collection<MongoOrderDocument>('orders')
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    if (!ObjectId.isValid(orderId)) {
      throw new Error(`Order id invalido: ${orderId}`)
    }

    const result = await this.collection.updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    )

    if (result.matchedCount === 0) {
      throw new Error(`Pedido nao encontrado para atualizar status: ${orderId}`)
    }
  }
}
