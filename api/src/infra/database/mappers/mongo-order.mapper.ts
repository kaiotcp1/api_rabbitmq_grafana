import { ObjectId } from 'mongodb'
import { Order } from '../../../domain/orders/order'

type MongoOrderDocument = Omit<Order, 'id'> & {
  _id?: ObjectId
}

export function toDomainOrder(order: MongoOrderDocument): Order {
  return {
    id: order._id?.toString(),
    customerId: order.customerId,
    items: order.items,
    totalAmount: order.totalAmount,
    source: order.source,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}

export type { MongoOrderDocument }
