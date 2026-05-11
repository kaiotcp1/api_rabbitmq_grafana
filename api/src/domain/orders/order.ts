export type OrderSource =
  | 'shopify'
  | 'woocommerce'
  | 'magento'
  | 'mercadolivre'
  | 'amazon'

export type OrderStatus = 'pending' | 'processed' | 'failed' | 'dead_letter'

export interface OrderItem {
  sku: string
  qty: number
  price: number
}

export interface Order {
  id?: string
  customerId: string
  items: OrderItem[]
  totalAmount: number
  source: OrderSource
  status: OrderStatus
  createdAt: Date
  updatedAt: Date
}
