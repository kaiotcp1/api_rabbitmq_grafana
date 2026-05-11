import { FastifyInstance } from 'fastify'
import { httpRequestDuration } from '../observability/metrics'

declare module 'fastify' {
  interface FastifyRequest {
    metricsStartedAt?: bigint
  }
}

export function registerMetricsHook(app: FastifyInstance): void {
  app.addHook('onRequest', async (request) => {
    request.metricsStartedAt = process.hrtime.bigint()
  })

  app.addHook('onResponse', async (request, reply) => {
    if (!request.metricsStartedAt) {
      return
    }

    const durationSeconds =
      Number(process.hrtime.bigint() - request.metricsStartedAt) / 1e9
    const route = request.routeOptions.url ?? request.url.split('?')[0]

    httpRequestDuration.observe(
      {
        method: request.method,
        route,
        status_code: String(reply.statusCode),
      },
      durationSeconds
    )
  })
}
