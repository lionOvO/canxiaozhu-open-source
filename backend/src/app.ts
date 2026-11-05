import { env } from './config/env.js'
import { registerV2Routes } from './routes/v2.js'
import { registerAgentKnowledgeRoutes } from './routes/agent-knowledge.js'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify, { type RawServerDefault } from 'fastify'
import { registerAccessGuard } from './security/access-guard.js'
import { initializeMemberships } from './services/shop-access.js'
import { registerMembershipRoutes } from './routes/memberships.js'

export async function buildApp() {
  const app = Fastify<RawServerDefault>({
    ...(process.env.NODE_ENV !== 'production'
      ? {
          logger: {
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            },
          },
        }
      : {}),
    bodyLimit: 1024 * 1024,
  })

  await app.register(cors, {
    origin: env.corsOrigins,
    credentials: true,
  })

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
  })

  await app.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
  })

  await app.register(swagger, {
    openapi: {
      info: {
        title: '餐小助 Backend API',
        version: '0.1.0',
        description: '与 PC 经营后台联调的业务接口。',
      },
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  })

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error)
    const missing = error && typeof error === 'object' && 'code' in error && error.code === 'P2025'
    const statusCode = missing ? 404 :
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500
    const message = missing ? '记录不存在或不属于当前门店。' : error instanceof Error ? error.message : 'Internal server error'
    const name = error instanceof Error ? error.name : 'Error'

    reply.status(statusCode).send({
      success: false,
      error: {
        message,
        code: name,
      },
    })
  })

  await initializeMemberships()
  registerAccessGuard(app)
  await registerMembershipRoutes(app)
  await registerV2Routes(app)
  await registerAgentKnowledgeRoutes(app)
  return app
}
