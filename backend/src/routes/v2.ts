import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { Type } from 'typebox'
import { LocationService } from '../services/location-service.js'
import { AuthError, AuthService } from '../services/auth-service.js'
import { AiProviderUnavailableError } from '../services/ai-provider.js'
import { DiningError, DiningService } from '../services/dining-service.js'
import { MerchantService } from '../services/merchant-service.js'
import { SmsError, SmsService } from '../services/sms-service.js'
import { QWeatherService } from '../services/weather-service.js'

const authService = new AuthService()
const smsService = new SmsService()
const merchantService = new MerchantService()
const diningService = new DiningService()
const locationService = new LocationService()
const weatherService = new QWeatherService()

const VoiceHistoryItem = Type.Object({
  role: Type.Union([Type.Literal('user'), Type.Literal('assistant')]),
  content: Type.String({ minLength: 1 }),
})

const SystemConfigEditablePayload = Type.Object({
  employees: Type.Array(
    Type.Object({
      id: Type.Number(),
      name: Type.String({ maxLength: 120 }),
      role: Type.String({ maxLength: 120 }),
      shift: Type.String({ maxLength: 120 }),
      permissionLevel: Type.String({ maxLength: 120 }),
    }),
    { maxItems: 50 },
  ),
  suppliers: Type.Array(
    Type.Object({
      id: Type.Number(),
      name: Type.String({ maxLength: 120 }),
      category: Type.String({ maxLength: 120 }),
      priceScore: Type.String({ maxLength: 120 }),
      qualityScore: Type.String({ maxLength: 120 }),
      status: Type.String({ maxLength: 120 }),
    }),
    { maxItems: 50 },
  ),
  knowledgeBase: Type.Array(
    Type.Object({
      id: Type.String({ maxLength: 120 }),
      title: Type.String({ maxLength: 120 }),
      type: Type.String({ maxLength: 120 }),
      updatedAt: Type.String({ maxLength: 120 }),
    }),
    { maxItems: 80 },
  ),
  permissions: Type.Array(
    Type.Object({
      role: Type.String({ maxLength: 120 }),
      scope: Type.Array(Type.String({ maxLength: 120 }), { maxItems: 20 }),
    }),
    { maxItems: 20 },
  ),
})

const Envelope = <T extends object>(data: T) => ({
  success: true,
  data,
})

function writeSseEvent(reply: FastifyReply, event: string, data: unknown): boolean {
  if (reply.raw.destroyed || reply.raw.writableEnded) {
    return false
  }

  reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  return true
}

function getUserFacingAiError(error: unknown): string {
  if (error instanceof AiProviderUnavailableError) {
    return error.message
  }

  return 'AI 助手暂时不可用，请稍后重试。'
}

function getBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  const token = authorization.slice('Bearer '.length).trim()
  return token.length ? token : null
}

function sendAuthLikeError(reply: FastifyReply, error: AuthError | SmsError) {
  return reply.status(error.statusCode).send({
    success: false,
    error: {
      message: error.message,
      code: error.name,
    },
  })
}

function sendBusinessError(reply: FastifyReply, error: DiningError) {
  return reply.status(error.statusCode).send({
    success: false,
    error: {
      message: error.message,
      code: error.name,
    },
  })
}

export async function registerV2Routes(fastify: FastifyInstance): Promise<void> {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>()

  server.get('/api/v2/health', async () => Envelope({ status: 'ok' as const }))

  server.get(
    '/api/v2/public/dining/:token/menu',
    {
      schema: {
        params: Type.Object({
          token: Type.String({ minLength: 8 }),
        }),
      },
    },
    async (request, reply) => {
      try {
        return Envelope(await diningService.getPublicMenu(request.params.token))
      } catch (error) {
        if (error instanceof DiningError) {
          return sendBusinessError(reply, error)
        }

        throw error
      }
    },
  )

  server.post(
    '/api/v2/public/dining/:token/orders',
    {
      schema: {
        params: Type.Object({
          token: Type.String({ minLength: 8 }),
        }),
        body: Type.Object({
          customer_phone: Type.Optional(Type.String()),
          customer_name: Type.Optional(Type.String()),
          remark: Type.Optional(Type.String()),
          people_count: Type.Optional(Type.Number()),
          existing_order_id: Type.Optional(Type.String()),
          items: Type.Array(
            Type.Object({
              menu_item_id: Type.String({ minLength: 1 }),
              quantity: Type.Number(),
              remark: Type.Optional(Type.String()),
            }),
            { minItems: 1 },
          ),
        }),
      },
    },
    async (request, reply) => {
      try {
        const orderInput = {
          ...(request.body.customer_phone ? { customerPhone: request.body.customer_phone } : {}),
          ...(request.body.customer_name ? { customerName: request.body.customer_name } : {}),
          ...(request.body.remark ? { remark: request.body.remark } : {}),
          ...(request.body.people_count ? { peopleCount: request.body.people_count } : {}),
          ...(request.body.existing_order_id ? { existingOrderId: request.body.existing_order_id } : {}),
          items: request.body.items.map((item) => ({
            menuItemId: item.menu_item_id,
            quantity: item.quantity,
            ...(item.remark ? { remark: item.remark } : {}),
          })),
        }

        return Envelope(
          await diningService.submitPublicOrder(request.params.token, orderInput),
        )
      } catch (error) {
        if (error instanceof DiningError) {
          return sendBusinessError(reply, error)
        }

        throw error
      }
    },
  )

  server.get(
    '/api/v2/public/dining/:token/orders/:orderId',
    {
      schema: {
        params: Type.Object({
          token: Type.String({ minLength: 8 }),
          orderId: Type.String({ minLength: 1 }),
        }),
      },
    },
    async (request, reply) => {
      try {
        return Envelope(await diningService.getPublicOrder(request.params.token, request.params.orderId))
      } catch (error) {
        if (error instanceof DiningError) {
          return sendBusinessError(reply, error)
        }

        throw error
      }
    },
  )

  server.post(
    '/api/v2/auth/login',
    {
      schema: {
        body: Type.Object({
          account: Type.String({ minLength: 1 }),
          password: Type.String({ minLength: 1 }),
        }),
      },
    },
    async (request, reply) => {
      try {
        const userAgent = request.headers['user-agent']
        return Envelope(
          await authService.login({
            account: request.body.account,
            password: request.body.password,
            ip: request.ip,
            ...(userAgent ? { userAgent } : {}),
          }),
        )
      } catch (error) {
        if (error instanceof AuthError) {
          return sendAuthLikeError(reply, error)
        }

        throw error
      }
    },
  )

  server.post(
    '/api/v2/auth/wechat/login-url',
    {
      schema: {
        body: Type.Object({
          redirect_path: Type.Optional(Type.String()),
        }),
      },
    },
    async (request, reply) => {
      try {
        return Envelope(authService.createWechatLoginUrl(request.body.redirect_path))
      } catch (error) {
        if (error instanceof AuthError) {
          return sendAuthLikeError(reply, error)
        }

        throw error
      }
    },
  )

  server.post(
    '/api/v2/auth/wechat/callback',
    {
      schema: {
        body: Type.Object({
          code: Type.String({ minLength: 1 }),
          state: Type.String({ minLength: 1 }),
        }),
      },
    },
    async (request, reply) => {
      try {
        const userAgent = request.headers['user-agent']
        return Envelope(
          await authService.loginWithWechatCode({
            code: request.body.code,
            state: request.body.state,
            ip: request.ip,
            ...(userAgent ? { userAgent } : {}),
          }),
        )
      } catch (error) {
        if (error instanceof AuthError) {
          return sendAuthLikeError(reply, error)
        }

        throw error
      }
    },
  )

  server.post(
    '/api/v2/auth/sms/send',
    {
      schema: {
        body: Type.Object({
          phone: Type.String({ minLength: 1 }),
        }),
      },
    },
    async (request, reply) => {
      try {
        return Envelope(await smsService.sendRegisterCode(request.body.phone))
      } catch (error) {
        if (error instanceof SmsError) {
          return sendAuthLikeError(reply, error)
        }

        throw error
      }
    },
  )

  server.post(
    '/api/v2/auth/register',
    {
      schema: {
        body: Type.Object({
          account: Type.String({ minLength: 1 }),
          phone: Type.String({ minLength: 1 }),
          email: Type.Optional(Type.String()),
          password: Type.String({ minLength: 1 }),
          confirm_password: Type.String({ minLength: 1 }),
          sms_code: Type.String({ minLength: 1 }),
          display_name: Type.Optional(Type.String()),
          invite_code: Type.Optional(Type.String({ minLength: 20, maxLength: 80 })),
        }),
      },
    },
    async (request, reply) => {
      try {
        if (request.body.password !== request.body.confirm_password) {
          throw new AuthError('两次输入的密码不一致。', 400)
        }

        const verifiedPhone = await smsService.verifyRegisterCode(request.body.phone, request.body.sms_code)
        const userAgent = request.headers['user-agent']
        return Envelope(
          await authService.register({
            account: request.body.account,
            phone: verifiedPhone,
            ...(request.body.invite_code ? { inviteCode: request.body.invite_code } : {}),
            ...(request.body.email ? { email: request.body.email } : {}),
            password: request.body.password,
            ...(request.body.display_name ? { displayName: request.body.display_name } : {}),
            ip: request.ip,
            ...(userAgent ? { userAgent } : {}),
          }),
        )
      } catch (error) {
        if (error instanceof AuthError || error instanceof SmsError) {
          return sendAuthLikeError(reply, error)
        }

        throw error
      }
    },
  )

  server.get('/api/v2/auth/me', async (request, reply) => {
    const token = getBearerToken(request.headers.authorization)
    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          message: '请先登录后再访问餐小助后台。',
          code: 'AuthError',
        },
      })
    }

    try {
      return Envelope(await authService.getUserByToken(token))
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthLikeError(reply, error)
      }

      throw error
    }
  })

  server.post('/api/v2/auth/logout', async (request) => {
    const token = getBearerToken(request.headers.authorization)
    if (!token) {
      return Envelope({ status: 'success' as const, message: '已退出登录。' })
    }

    return Envelope(await authService.logout(token))
  })

  server.get('/api/v2/weather/ip-city', async (request) =>
    Envelope(await locationService.detectIpLocation(request.headers, request.ip)),
  )

  server.post(
    '/api/v2/weather/live',
    {
      schema: {
        body: Type.Object({
          city: Type.Optional(Type.String()),
          latitude: Type.Optional(Type.Number()),
          longitude: Type.Optional(Type.Number()),
          city_label: Type.Optional(Type.String()),
        }),
      },
    },
    async (request, reply) => {
      try {
        const { city, latitude, longitude, city_label: cityLabel } = request.body

        if (typeof latitude === 'number' && typeof longitude === 'number') {
          return Envelope(await weatherService.fetchByCoordinates(latitude, longitude, cityLabel))
        }

        if (city?.trim()) {
          return Envelope(await weatherService.fetchByCity(city))
        }

        return reply.status(400).send({
          success: false,
          error: {
            message: '请提供天气城市，或提供 latitude 与 longitude。',
          },
        })
      } catch (error) {
        request.log.error(error)
        return reply.status(503).send({
          success: false,
          error: {
            message: error instanceof Error ? error.message : '天气服务暂时不可用，请稍后重试。',
          },
        })
      }
    },
  )

  server.get('/api/v2/shop/list', async request => Envelope((await merchantService.listShops()).filter(shop => request.accessUser!.assignedShopIds.includes(shop.id))))

  server.post(
    '/api/v2/shop/rename',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          name: Type.String({ minLength: 1, maxLength: 60 }),
        }),
      },
    },
    async (request, reply) => {
      try {
        return Envelope(await merchantService.renameShop(request.body.shop_id, request.body.name))
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: {
            message: error instanceof Error ? error.message : '门店更名失败，请稍后重试。',
          },
        })
      }
    },
  )

  server.post(
    '/api/v2/shop/delete',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
        }),
      },
    },
    async (request, reply) => {
      try {
        return Envelope(await merchantService.deleteShop(request.body.shop_id))
      } catch (error) {
        return reply.status(400).send({
          success: false,
          error: {
            message: error instanceof Error ? error.message : '门店删除失败，请稍后重试。',
          },
        })
      }
    },
  )

  server.post(
    '/api/v2/dashboard/overview',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
        }),
      },
    },
    async (request) => Envelope(await merchantService.getDashboard(request.body.shop_id)),
  )

  server.post(
    '/api/v2/dining/tables',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
        }),
      },
    },
    async (request, reply) => {
      try {
        return Envelope(await diningService.listTables(request.body.shop_id))
      } catch (error) {
        if (error instanceof DiningError) {
          return sendBusinessError(reply, error)
        }

        throw error
      }
    },
  )

  server.post(
    '/api/v2/dining/menu',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const menu = await diningService.listMenu(request.body.shop_id)
        const canReadCost = request.accessUser!.memberships.find(member => member.shopId === request.body.shop_id)?.permissions.includes('dishes')
        return Envelope(canReadCost ? menu : menu.map(({ cost: _cost, ...item }) => item))
      } catch (error) {
        if (error instanceof DiningError) {
          return sendBusinessError(reply, error)
        }

        throw error
      }
    },
  )

  server.post(
    '/api/v2/dining/orders',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          status: Type.Optional(Type.String()),
        }),
      },
    },
    async (request, reply) => {
      try {
        return Envelope(await diningService.listOrders(request.body.shop_id, request.body.status))
      } catch (error) {
        if (error instanceof DiningError) {
          return sendBusinessError(reply, error)
        }

        throw error
      }
    },
  )

  server.post(
    '/api/v2/dining/orders/status',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          order_id: Type.String({ minLength: 1 }),
          status: Type.String({ minLength: 1 }),
        }),
      },
    },
    async (request, reply) => {
      try {
        return Envelope(
          await diningService.updateOrderStatus(
            request.body.shop_id,
            request.body.order_id,
            request.body.status,
          ),
        )
      } catch (error) {
        if (error instanceof DiningError) {
          return sendBusinessError(reply, error)
        }

        throw error
      }
    },
  )

  server.post(
    '/api/v2/daily-report/get',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          date: Type.Optional(Type.String()),
        }),
      },
    },
    async (request) =>
      Envelope(await merchantService.getDailyReport(request.body.shop_id, request.body.date)),
  )

  server.post(
    '/api/v2/customer/profile',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
        }),
      },
    },
    async (request) => {
      await diningService.backfillCustomerProfiles(request.body.shop_id)
      return Envelope(await merchantService.listCustomers(request.body.shop_id))
    },
  )

  server.post(
    '/api/v2/customer/assets/overview',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
        }),
      },
    },
    async (request) => {
      await diningService.backfillCustomerProfiles(request.body.shop_id)
      return Envelope(await merchantService.getCustomerAssetOverview(request.body.shop_id))
    },
  )

  server.post(
    '/api/v2/dish/quadrant',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          period: Type.Number(),
        }),
      },
    },
    async (request) =>
      Envelope(await merchantService.getDishQuadrant(request.body.shop_id, request.body.period)),
  )

  server.post(
    '/api/v2/purchase/order/generate',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
        }),
      },
    },
    async (request) => Envelope(await merchantService.getPurchaseOrder(request.body.shop_id)),
  )

  server.post(
    '/api/v2/purchase/order/regenerate',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
        }),
      },
    },
    async (request) =>
      Envelope(await merchantService.regeneratePurchaseOrder(request.body.shop_id)),
  )

  server.post(
    '/api/v2/purchase/order/confirm',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          order: Type.Any(),
        }),
      },
    },
    async (request) =>
      Envelope(await merchantService.confirmPurchaseOrder(request.body.shop_id, request.body.order)),
  )

  server.post(
    '/api/v2/purchase/order/export',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          order: Type.Any(),
        }),
      },
    },
    async (request, reply) => {
      const exported = await merchantService.exportPurchaseOrder(
        request.body.shop_id,
        request.body.order,
      )

      return reply
        .type('text/csv; charset=utf-8')
        .header(
          'Content-Disposition',
          `attachment; filename*=UTF-8''${encodeURIComponent(exported.filename)}`,
        )
        .header('Access-Control-Expose-Headers', 'Content-Disposition, X-Export-Message')
        .header('X-Export-Message', encodeURIComponent(exported.message))
        .send(exported.content)
    },
  )

  server.post(
    '/api/v2/review/aggregate',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          platform: Type.Optional(Type.String()),
          rating: Type.Optional(Type.Number()),
          start_date: Type.Optional(Type.String()),
          end_date: Type.Optional(Type.String()),
          handled: Type.Optional(Type.Boolean()),
        }),
      },
    },
    async (request) => {
      const filters = {
        ...(request.body.platform !== undefined ? { platform: request.body.platform } : {}),
        ...(request.body.rating !== undefined ? { rating: request.body.rating } : {}),
        ...(request.body.start_date !== undefined ? { startDate: request.body.start_date } : {}),
        ...(request.body.end_date !== undefined ? { endDate: request.body.end_date } : {}),
        ...(request.body.handled !== undefined ? { handled: request.body.handled } : {}),
      }

      return Envelope(await merchantService.aggregateReviews(request.body.shop_id, filters))
    },
  )

  server.post(
    '/api/v2/review/reply/open',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          review_id: Type.String(),
        }),
      },
    },
    async (request) =>
      Envelope(await merchantService.openReviewReply(request.body.shop_id, request.body.review_id)),
  )

  server.post(
    '/api/v2/review/handled',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          review_id: Type.String(),
        }),
      },
    },
    async (request) =>
      Envelope(await merchantService.markReviewHandled(request.body.shop_id, request.body.review_id)),
  )

  server.get('/api/v2/chain/board', async request => Envelope(await merchantService.getChainBoard(request.accessUser!.memberships.filter(member => member.permissions.includes('chain-board')).map(member => member.shopId))))

  server.post(
    '/api/v2/system/config',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
        }),
      },
    },
    async (request) => Envelope(await merchantService.getSystemConfig(request.body.shop_id)),
  )

  server.post(
    '/api/v2/system/config/save',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          config: SystemConfigEditablePayload,
        }),
      },
    },
    async (request) =>
      Envelope(await merchantService.saveSystemConfig(request.body.shop_id, request.body.config)),
  )

  server.post(
    '/api/v2/voice/qa',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          question_text: Type.String({ minLength: 1 }),
          history: Type.Optional(Type.Array(VoiceHistoryItem)),
        }),
      },
    },
    async (request, reply) => {
      try {
        return Envelope(
          await merchantService.askVoiceQuestion(
            request.body.shop_id,
            request.body.question_text,
            request.body.history,
          ),
        )
      } catch (error) {
        request.log.error(error)
        return reply.status(503).send({
          success: false,
          error: {
            message: getUserFacingAiError(error),
          },
        })
      }
    },
  )

  server.post(
    '/api/v2/voice/qa/stream',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          question_text: Type.String({ minLength: 1 }),
          history: Type.Optional(Type.Array(VoiceHistoryItem)),
        }),
      },
    },
    async (request, reply) => {
      reply.hijack()
      reply.raw.statusCode = 200
      reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      reply.raw.setHeader('Cache-Control', 'no-cache, no-transform')
      reply.raw.setHeader('Connection', 'keep-alive')
      reply.raw.setHeader('X-Accel-Buffering', 'no')
      reply.raw.flushHeaders?.()

      const abortController = new AbortController()
      let finished = false
      let disconnected = reply.raw.destroyed
      const handleClose = () => {
        if (finished) {
          return
        }

        disconnected = true
        abortController.abort()
      }

      request.raw.once('aborted', handleClose)
      reply.raw.once('close', handleClose)

      try {
        writeSseEvent(reply, 'start', {
          shop_id: request.body.shop_id,
        })

        for await (const event of merchantService.streamVoiceQuestion(
          request.body.shop_id,
          request.body.question_text,
          abortController.signal,
          request.body.history,
        )) {
          if (disconnected || reply.raw.destroyed) {
            break
          }

          if (event.type === 'delta') {
            writeSseEvent(reply, 'delta', {
              delta: event.delta,
            })
            continue
          }

          if (event.type !== 'complete') continue
          writeSseEvent(reply, 'done', {
            message: event.message,
          })
        }
      } catch (error) {
        request.log.error(error)
        if (!disconnected && !reply.raw.destroyed) {
          writeSseEvent(reply, 'error', {
            message: getUserFacingAiError(error),
          })
        }
      } finally {
        finished = true
        request.raw.off('aborted', handleClose)
        reply.raw.off('close', handleClose)
        if (!reply.raw.writableEnded) {
          reply.raw.end()
        }
      }

      return reply
    },
  )

  server.post(
    '/api/v2/agent/qa',
    {
      preHandler: async (request, reply) => {
        try {
          const token = getBearerToken(request.headers.authorization)
          if (!token) throw new AuthError('请先登录后使用经营 Agent。')
          const user = await authService.getUserByToken(token)
          const shopId = (request.body as { shop_id: number }).shop_id
          if (!user.assignedShopIds.includes(shopId)) throw new AuthError('无权访问此门店。', 403)
        } catch (error) {
          if (error instanceof AuthError) return sendAuthLikeError(reply, error)
          throw error
        }
      },
      schema: {
        body: Type.Object({
          shop_id: Type.Integer({ minimum: 1 }),
          question_text: Type.String({ minLength: 1, maxLength: 2000 }),
          history: Type.Optional(Type.Array(VoiceHistoryItem, { maxItems: 8 })),
        }),
      },
    },
    async (request, reply) => {
      try {
        return Envelope(
          await merchantService.askAgentQuestion(
            request.body.shop_id,
            request.body.question_text,
            request.body.history,
            request.accessUser!.id,
          ),
        )
      } catch (error) {
        request.log.error(error)
        return reply.status(503).send({
          success: false,
          error: {
            message: getUserFacingAiError(error),
          },
        })
      }
    },
  )

  server.post(
    '/api/v2/agent/qa/stream',
    {
      preHandler: async (request, reply) => {
        try {
          const token = getBearerToken(request.headers.authorization)
          if (!token) throw new AuthError('请先登录后使用经营 Agent。')
          const user = await authService.getUserByToken(token)
          const shopId = (request.body as { shop_id: number }).shop_id
          if (!user.assignedShopIds.includes(shopId)) throw new AuthError('无权访问此门店。', 403)
        } catch (error) {
          if (error instanceof AuthError) return sendAuthLikeError(reply, error)
          throw error
        }
      },
      schema: {
        body: Type.Object({
          shop_id: Type.Integer({ minimum: 1 }),
          question_text: Type.String({ minLength: 1, maxLength: 2000 }),
          history: Type.Optional(Type.Array(VoiceHistoryItem, { maxItems: 8 })),
        }),
      },
    },
    async (request, reply) => {
      reply.hijack()
      reply.raw.statusCode = 200
      reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      reply.raw.setHeader('Cache-Control', 'no-cache, no-transform')
      reply.raw.setHeader('Connection', 'keep-alive')
      reply.raw.setHeader('X-Accel-Buffering', 'no')
      reply.raw.flushHeaders?.()

      const abortController = new AbortController()
      let finished = false
      let disconnected = reply.raw.destroyed
      const handleClose = () => {
        if (finished) {
          return
        }

        disconnected = true
        abortController.abort()
      }

      request.raw.once('aborted', handleClose)
      reply.raw.once('close', handleClose)

      try {
        writeSseEvent(reply, 'start', {
          shop_id: request.body.shop_id,
        })

        for await (const event of merchantService.streamAgentQuestion(
          request.body.shop_id,
          request.body.question_text,
          abortController.signal,
          request.body.history,
            request.accessUser!.id,
        )) {
          if (disconnected || reply.raw.destroyed) {
            break
          }

          if (event.type === 'tool_start' || event.type === 'tool_end') {
            writeSseEvent(reply, event.type, { name: event.name, label: event.label, callId: event.callId })
            continue
          }
          if (event.type === 'delta') {
            writeSseEvent(reply, 'delta', {
              delta: event.delta,
            })
            continue
          }

          if (event.type !== 'complete') continue
          writeSseEvent(reply, 'done', {
            message: event.message,
          })
        }
      } catch (error) {
        request.log.error(error)
        if (!disconnected && !reply.raw.destroyed) {
          writeSseEvent(reply, 'error', {
            message: getUserFacingAiError(error),
          })
        }
      } finally {
        finished = true
        request.raw.off('aborted', handleClose)
        reply.raw.off('close', handleClose)
        if (!reply.raw.writableEnded) {
          reply.raw.end()
        }
      }

      return reply
    },
  )

  server.post(
    '/api/v2/todo/dismiss',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          todo_id: Type.String({ minLength: 1 }),
        }),
      },
    },
    async (request) =>
      Envelope(await merchantService.dismissTodo(request.body.shop_id, request.body.todo_id)),
  )

  server.post(
    '/api/v2/customer/coupon/send',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          customer_id: Type.Number(),
          coupon_name: Type.String({ minLength: 1 }),
          scenario: Type.String({ minLength: 1 }),
        }),
      },
    },
    async (request) =>
      Envelope(
        await merchantService.sendCoupon(
          request.body.shop_id,
          request.body.customer_id,
          request.body.coupon_name,
          request.body.scenario,
        ),
      ),
  )

  server.post(
    '/api/v2/customer/notes/save',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          customer_id: Type.Number(),
          notes: Type.Array(Type.String()),
        }),
      },
    },
    async (request) =>
      Envelope(
        await merchantService.saveCustomerNotes(
          request.body.shop_id,
          request.body.customer_id,
          request.body.notes,
        ),
      ),
  )

  server.post(
    '/api/v2/inventory/mark-special',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          ingredient: Type.String({ minLength: 1 }),
        }),
      },
    },
    async (request) =>
      Envelope(await merchantService.markIngredientAsSpecial(request.body.shop_id, request.body.ingredient)),
  )

  server.post(
    '/api/v2/inventory/overview',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
        }),
      },
    },
    async (request) =>
      Envelope(await merchantService.getInventoryOverview(request.body.shop_id)),
  )

  server.post(
    '/api/v2/inventory/save',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          ingredient: Type.String({ minLength: 1, maxLength: 60 }),
          unit: Type.String({ minLength: 1, maxLength: 12 }),
          current_qty: Type.Number({ minimum: 0 }),
          in_transit_qty: Type.Number({ minimum: 0 }),
          reorder_level: Type.Number({ minimum: 0 }),
          unit_cost: Type.Number({ minimum: 0 }),
          supplier: Type.Optional(Type.String({ maxLength: 60 })),
        }),
      },
    },
    async (request) =>
      Envelope(
        await merchantService.saveInventoryItem(request.body.shop_id, {
          ingredient: request.body.ingredient,
          unit: request.body.unit,
          currentQty: request.body.current_qty,
          inTransitQty: request.body.in_transit_qty,
          reorderLevel: request.body.reorder_level,
          unitCost: request.body.unit_cost,
          ...(request.body.supplier !== undefined ? { supplier: request.body.supplier } : {}),
        }),
      ),
  )

  server.post(
    '/api/v2/inventory/receive',
    {
      schema: {
        body: Type.Object({
          shop_id: Type.Number(),
          ingredient: Type.String({ minLength: 1, maxLength: 60 }),
          quantity: Type.Number({ exclusiveMinimum: 0 }),
          note: Type.Optional(Type.String({ maxLength: 120 })),
        }),
      },
    },
    async (request) =>
      Envelope(
        await merchantService.receiveInventory(
          request.body.shop_id,
          request.body.ingredient,
          request.body.quantity,
          request.body.note,
        ),
      ),
  )
}
