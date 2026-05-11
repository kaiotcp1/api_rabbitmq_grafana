import { createServer } from 'http'
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client'

export const registry = new Registry()

collectDefaultMetrics({ register: registry })

export const ordersPublishedTotal = new Counter({
  name: 'orders_published_total',
  help: 'Total de pedidos publicados no RabbitMQ pela API',
  labelNames: ['source'],
  registers: [registry],
})

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duracao das requisicoes HTTP em segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
})

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
    console.log(`[Metrics] API expondo metricas na porta ${port}`)
  })
}
