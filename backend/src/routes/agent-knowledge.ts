import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { Type } from 'typebox'
import { AuthError, AuthService } from '../services/auth-service.js'
import { getPublicAiStatus } from '../config/ai.js'
import { requirePermission } from '../services/shop-access.js'
import { knowledgeService } from '../services/knowledge-service.js'

export async function registerAgentKnowledgeRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()
  const auth = new AuthService()
  async function authorize(request: FastifyRequest, editor = false) {
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1]?.trim()
    if (!token) throw new AuthError('请先登录后访问经营资料。')
    const user = await auth.getUserByToken(token)
    const shopId = (request.body as { shop_id?: number } | null)?.shop_id ?? (request.query as { shop_id: number }).shop_id
    if (!user.assignedShopIds.includes(shopId!)) throw new AuthError('无权访问此门店。', 403)
    if (editor) await requirePermission(user.id, shopId!, 'knowledge:write')
  }
  const shopQuery = Type.Object({ shop_id: Type.Integer({ minimum: 1 }) })
  const docParams = Type.Object({ id: Type.String({ minLength: 1, maxLength: 80 }) })
  const read = async (request: FastifyRequest) => authorize(request)
  const edit = async (request: FastifyRequest) => authorize(request, true)

  server.get('/api/v2/agent/status', { schema: { querystring: shopQuery }, preHandler: read }, async request => {
    return { success: true, data: { ...getPublicAiStatus(), ...await knowledgeService.status(request.query.shop_id) } }
  })
  server.post('/api/v2/agent/knowledge/index', {
    schema: { body: shopQuery }, preHandler: edit,
  }, async request => ({ success: true, data: await knowledgeService.indexBatch(request.body.shop_id) }))
  server.get('/api/v2/agent/knowledge', { schema: { querystring: shopQuery }, preHandler: read }, async request =>
    ({ success: true, data: await knowledgeService.list(request.query.shop_id) }))
  server.get('/api/v2/agent/knowledge/:id', { schema: { querystring: shopQuery, params: docParams }, preHandler: read }, async request =>
    ({ success: true, data: await knowledgeService.get(request.query.shop_id, request.params.id) }))
  server.post('/api/v2/agent/knowledge', {
    preHandler: edit,
    schema: { body: Type.Object({
      shop_id: Type.Integer({ minimum: 1 }), title: Type.String({ minLength: 1, maxLength: 100 }),
      category: Type.Union([Type.Literal('采购规范'), Type.Literal('供应商说明'), Type.Literal('异常处理')]),
      version: Type.String({ minLength: 1, maxLength: 40 }), sourceName: Type.String({ minLength: 1, maxLength: 120 }),
      effectiveFrom: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
      effectiveUntil: Type.Optional(Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })),
      content: Type.String({ minLength: 20, maxLength: 60000 }),
    }, { additionalProperties: false }) },
  }, async request => ({ success: true, data: await knowledgeService.import(request.body.shop_id, request.body) }))
  server.post('/api/v2/agent/knowledge/:id/archive', {
    schema: { params: docParams, body: shopQuery }, preHandler: edit,
  }, async request => ({ success: true, data: await knowledgeService.archive(request.body.shop_id, request.params.id) }))
  server.post('/api/v2/agent/knowledge/:id/activate', {
    schema: { params: docParams, body: shopQuery }, preHandler: edit,
  }, async request => ({ success: true, data: await knowledgeService.activate(request.body.shop_id, request.params.id) }))
}
