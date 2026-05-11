import { FastifyError, FastifyInstance } from 'fastify'
import { AppError } from '../../domain/errors/app-error'

type ErrorWithValidation = FastifyError & {
  validation?: unknown
}

function hasValidationError(error: unknown): error is ErrorWithValidation {
  return (
    typeof error === 'object' &&
    error !== null &&
    'validation' in error &&
    Boolean((error as ErrorWithValidation).validation)
  )
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error)

    if (hasValidationError(error)) {
      return reply.status(400).send({
        error: 'ValidationError',
        message: 'Invalid request payload',
        details: error.validation,
      })
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
      })
    }

    return reply.status(500).send({
      error: 'InternalServerError',
      message: 'Unexpected error',
    })
  })
}
