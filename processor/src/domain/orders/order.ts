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
