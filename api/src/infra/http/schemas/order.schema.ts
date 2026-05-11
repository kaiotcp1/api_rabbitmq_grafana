import { Type } from '@sinclair/typebox'

export const CreateOrderSchema = Type.Object({
  customerId: Type.String({ minLength: 1 }),
  items: Type.Array(
    Type.Object({
      sku: Type.String({ minLength: 1 }),
      qty: Type.Number({ minimum: 1 }),
      price: Type.Number({ minimum: 0 }),
    }),
    { minItems: 1 }
  ),
  source: Type.Union([
    Type.Literal('shopify'),
    Type.Literal('woocommerce'),
    Type.Literal('magento'),
    Type.Literal('mercadolivre'),
    Type.Literal('amazon'),
  ]),
})
