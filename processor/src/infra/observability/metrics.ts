import { createServer } from 'http'
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client'

export const registry = new Registry()

collectDefaultMetrics({ register: registry })

export const ordersProcessedTotal = new Counter({
  name: 'orders_processed_total',
  help: 'Total de pedidos processados com sucesso pelo processor',
  labelNames: ['source'],
  registers: [registry],
})

export const ordersRetriedTotal = new Counter({
  name: 'orders_retried_total',
  help: 'Total de retries publicados pelo processor',
  labelNames: ['source'],
  registers: [registry],
})

export const ordersFailedTotal = new Counter({
  name: 'orders_failed_total',
  help: 'Total de falhas definitivas ou payloads invalidos no processor',
  labelNames: ['reason'],
  registers: [registry],
})

export const orderProcessingDuration = new Histogram({
  name: 'order_processing_duration_seconds',
  help: 'Tempo de processamento de cada mensagem de pedido no processor',
  labelNames: ['status', 'source'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
})

export function observeProcessingDuration(
  status: 'success' | 'retry' | 'dead_letter' | 'invalid_payload',
  source: string,
  durationSeconds: number
): void {
  orderProcessingDuration.observe({ status, source }, durationSeconds)
}

export function startMetricsServer(port: number): void {
  const server = createServer(async (request, response) => {
    if (request.method !== 'GET' || request.url !== '/metrics') {
      response.writeHead(404, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: 'NotFound' }))
      return
    }

    response.writeHead(200, { 'Content-Type': registry.contentType })
    response.end(await registry.metrics())
  })

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Metrics] Processor expondo metricas na porta ${port}`)
  })
}
