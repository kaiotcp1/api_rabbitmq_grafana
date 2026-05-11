#!/usr/bin/env node

const DEFAULT_API_URL = 'http://localhost:3001/api/v1'
const DEFAULT_COUNT = 100
const DEFAULT_FAILURE_RATE = 0.3
const DEFAULT_CONCURRENCY = 10

const sources = ['shopify', 'woocommerce', 'magento', 'mercadolivre', 'amazon']
const products = [
  { sku: 'SKU-IPHONE-15', price: 4899.9 },
  { sku: 'SKU-CAPINHA-PRETA', price: 79.9 },
  { sku: 'SKU-MOUSE-GAMER', price: 189.9 },
  { sku: 'SKU-TECLADO-MECANICO', price: 349.9 },
  { sku: 'SKU-MONITOR-27', price: 1299.9 },
  { sku: 'SKU-HEADSET', price: 249.9 },
  { sku: 'SKU-WEBCAM', price: 219.9 },
  { sku: 'SKU-NOTEBOOK', price: 5899.9 },
]

function parseArgs(argv) {
  const args = {
    apiUrl: process.env.API_URL || DEFAULT_API_URL,
    count: Number(process.env.ORDER_COUNT || DEFAULT_COUNT),
    failureRate: Number(process.env.FAILURE_RATE || DEFAULT_FAILURE_RATE),
    concurrency: Number(process.env.CONCURRENCY || DEFAULT_CONCURRENCY),
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === '--api-url' && next) args.apiUrl = next
    if (arg === '--count' && next) args.count = Number(next)
    if (arg === '--failure-rate' && next) args.failureRate = Number(next)
    if (arg === '--concurrency' && next) args.concurrency = Number(next)
    if (arg === '--help') {
      printHelp()
      process.exit(0)
    }
  }

  if (!Number.isInteger(args.count) || args.count < 1) {
    throw new Error('--count deve ser um inteiro maior que zero')
  }

  if (Number.isNaN(args.failureRate) || args.failureRate < 0 || args.failureRate > 1) {
    throw new Error('--failure-rate deve ficar entre 0 e 1')
  }

  if (!Number.isInteger(args.concurrency) || args.concurrency < 1) {
    throw new Error('--concurrency deve ser um inteiro maior que zero')
  }

  return args
}

function printHelp() {
  console.log(`
Uso:
  node scripts/create-random-orders.js --count 100 --failure-rate 0.3 --concurrency 10

Opcoes:
  --api-url        URL da API. Padrao: ${DEFAULT_API_URL}
  --count          Quantidade de pedidos. Padrao: ${DEFAULT_COUNT}
  --failure-rate   Percentual de pedidos que forcarao falha no ERP. Padrao: ${DEFAULT_FAILURE_RATE}
  --concurrency    Quantidade de requests paralelas. Padrao: ${DEFAULT_CONCURRENCY}

Exemplo:
  node scripts/create-random-orders.js --count 200 --failure-rate 0.35 --concurrency 15
`)
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem(items) {
  return items[randomInt(0, items.length - 1)]
}

function createOrderPayload(index, shouldFail) {
  const itemCount = randomInt(1, 4)
  const items = Array.from({ length: itemCount }, (_, itemIndex) => {
    const product = randomItem(products)
    const sku =
      shouldFail && itemIndex === 0
        ? `FAIL-${product.sku}-${index}`
        : `${product.sku}-${randomInt(1000, 9999)}`

    return {
      sku,
      qty: randomInt(1, 5),
      price: product.price,
    }
  })

  return {
    customerId: shouldFail
      ? `fail-customer-${String(index).padStart(4, '0')}`
      : `customer-${String(index).padStart(4, '0')}`,
    source: randomItem(sources),
    items,
  }
}

async function createOrder(apiUrl, payload) {
  const response = await fetch(`${apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      `POST /orders falhou com status ${response.status}: ${JSON.stringify(body)}`
    )
  }

  return body
}

async function runQueue(items, concurrency, worker) {
  let currentIndex = 0
  const results = []

  async function runWorker() {
    while (currentIndex < items.length) {
      const item = items[currentIndex]
      currentIndex += 1
      results.push(await worker(item))
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runWorker()
  )

  await Promise.all(workers)

  return results
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const startedAt = Date.now()

  const jobs = Array.from({ length: args.count }, (_, index) => {
    const shouldFail = Math.random() < args.failureRate

    return {
      index: index + 1,
      shouldFail,
      payload: createOrderPayload(index + 1, shouldFail),
    }
  })

  const summary = {
    created: 0,
    expectedToProcess: 0,
    expectedToFail: 0,
    failedRequests: 0,
    createdIds: [],
  }

  console.log(
    `[LoadTest] Criando ${args.count} pedidos em ${args.apiUrl} com concurrency=${args.concurrency} e failureRate=${args.failureRate}`
  )

  await runQueue(jobs, args.concurrency, async (job) => {
    try {
      const order = await createOrder(args.apiUrl, job.payload)

      summary.created += 1
      summary.createdIds.push(order.id)

      if (job.shouldFail) {
        summary.expectedToFail += 1
      } else {
        summary.expectedToProcess += 1
      }

      console.log(
        `[LoadTest] ${job.index}/${args.count} criado id=${order.id} expected=${
          job.shouldFail ? 'dead_letter' : 'processed'
        }`
      )
    } catch (error) {
      summary.failedRequests += 1
      console.error(
        `[LoadTest] ${job.index}/${args.count} falhou: ${error.message}`
      )
    }
  })

  const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(2)

  console.log('\n[LoadTest] Resumo')
  console.log(`Criados: ${summary.created}`)
  console.log(`Falhas HTTP: ${summary.failedRequests}`)
  console.log(`Esperado processed: ${summary.expectedToProcess}`)
  console.log(`Esperado dead_letter: ${summary.expectedToFail}`)
  console.log(`Duracao: ${durationSeconds}s`)
  console.log('\n[LoadTest] Depois acompanhe:')
  console.log('  docker compose logs -f processor')
  console.log('  RabbitMQ UI -> Queues -> orders.processing / orders.dead')
}

main().catch((error) => {
  console.error(`[LoadTest] Erro fatal: ${error.message}`)
  process.exit(1)
})
