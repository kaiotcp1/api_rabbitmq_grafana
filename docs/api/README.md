# API, Rotas e Payloads

Documentação prática para testar o fluxo do **Order Integration Hub** localmente.

## Base URL

```text
http://localhost:3001
```

As rotas de pedidos usam prefixo:

```text
/api/v1
```

## Health Check

### `GET /health`

Verifica se a API está respondendo.

```powershell
curl http://localhost:3001/health
```

Resposta:

```json
{
  "status": "ok",
  "service": "API",
  "version": "1.0.0",
  "timestamp": "2026-05-11T12:00:00.000Z"
}
```

## Criar Pedido

### `POST /api/v1/orders`

Cria um pedido, persiste no MongoDB com status `pending` e publica uma mensagem persistente no RabbitMQ.

```powershell
curl -X POST http://localhost:3001/api/v1/orders `
  -H "Content-Type: application/json" `
  -d "{\"customerId\":\"customer-001\",\"source\":\"shopify\",\"items\":[{\"sku\":\"SKU-IPHONE-15\",\"qty\":1,\"price\":4899.9},{\"sku\":\"SKU-CAPINHA-PRETA\",\"qty\":2,\"price\":79.9}]}"
```

Payload:

```json
{
  "customerId": "customer-001",
  "source": "shopify",
  "items": [
    {
      "sku": "SKU-IPHONE-15",
      "qty": 1,
      "price": 4899.9
    },
    {
      "sku": "SKU-CAPINHA-PRETA",
      "qty": 2,
      "price": 79.9
    }
  ]
}
```

Fontes aceitas:

```text
shopify
woocommerce
magento
mercadolivre
amazon
```

Resposta `201 Created`:

```json
{
  "id": "6637f8a9f4f8d4b09fca0101",
  "customerId": "customer-001",
  "items": [
    {
      "sku": "SKU-IPHONE-15",
      "qty": 1,
      "price": 4899.9
    },
    {
      "sku": "SKU-CAPINHA-PRETA",
      "qty": 2,
      "price": 79.9
    }
  ],
  "totalAmount": 5059.7,
  "source": "shopify",
  "status": "pending",
  "createdAt": "2026-05-11T12:00:00.000Z",
  "updatedAt": "2026-05-11T12:00:00.000Z"
}
```

## Buscar Pedido

### `GET /api/v1/orders/:id`

Consulta o pedido no MongoDB.

```powershell
curl http://localhost:3001/api/v1/orders/6637f8a9f4f8d4b09fca0101
```

Respostas possíveis:

- `200 OK`: pedido encontrado.
- `404 Not Found`: pedido inexistente ou `ObjectId` inválido.

```json
{
  "error": "OrderNotFound"
}
```

## Testar Falha, Retry e DLQ

O ERP simulado falha de forma determinística quando:

- `customerId` começa com `fail`
- algum `sku` começa com `FAIL`

Exemplo:

```powershell
curl -X POST http://localhost:3001/api/v1/orders `
  -H "Content-Type: application/json" `
  -d "{\"customerId\":\"fail-customer-001\",\"source\":\"mercadolivre\",\"items\":[{\"sku\":\"FAIL-SKU-ERP\",\"qty\":1,\"price\":100}]}"
```

Com `PROCESSOR_MAX_ATTEMPTS=3`, o fluxo esperado é:

1. Pedido criado como `pending`.
2. Processor tenta integrar no ERP simulado.
3. Em falha antes do limite, pedido vira `failed` e uma nova mensagem é publicada com `attempt + 1`.
4. Após a última tentativa, pedido vira `dead_letter`.
5. Mensagem original é rejeitada com `nack(false, false)` e enviada para `orders.dead`.

## Script de Carga

```powershell
node scripts/create-random-orders.js --count 200 --failure-rate 0.35 --concurrency 15
```

Parâmetros:

| Parâmetro | Descrição | Padrão |
|---|---|---|
| `--api-url` | URL base da API de pedidos | `http://localhost:3001/api/v1` |
| `--count` | Quantidade de pedidos criados | `100` |
| `--failure-rate` | Percentual de pedidos com falha forçada | `0.3` |
| `--concurrency` | Número de requests paralelas | `10` |

Também é possível configurar por variáveis de ambiente:

```text
API_URL
ORDER_COUNT
FAILURE_RATE
CONCURRENCY
```

## Status do Pedido

| Status | Quando acontece |
|---|---|
| `pending` | Pedido criado e publicado na fila |
| `processed` | ERP simulado respondeu com sucesso |
| `failed` | Falha recuperável antes do limite de tentativas |
| `dead_letter` | Falha definitiva após esgotar tentativas |

## Topologia RabbitMQ

| Recurso | Nome | Tipo / routing |
|---|---|---|
| Exchange principal | `orders` | `topic` |
| Routing key | `orders.new` | Roteia pedidos novos |
| Queue principal | `orders.processing` | Consumo do processor |
| Dead Letter Exchange | `orders.dlx` | `direct` |
| Dead Letter Queue | `orders.dead` | Mensagens rejeitadas definitivamente |

Mensagem publicada:

```json
{
  "orderId": "6637f8a9f4f8d4b09fca0101",
  "customerId": "customer-001",
  "items": [
    {
      "sku": "SKU-IPHONE-15",
      "qty": 1,
      "price": 4899.9
    }
  ],
  "totalAmount": 4899.9,
  "source": "shopify",
  "createdAt": "2026-05-11T12:00:00.000Z",
  "attempt": 1
}
```

## Variáveis de Ambiente

```env
MONGODB_URI=mongodb://admin:123456789@mongodb:27017/orders?authSource=admin
RABBITMQ_URL=amqp://admin:123456789@rabbitmq:5672
API_PORT=3001
API_METRICS_PORT=9101
PROCESSOR_METRICS_PORT=9102
PROCESSOR_MAX_ATTEMPTS=3
ERP_FAILURE_RATE=0.1
```
