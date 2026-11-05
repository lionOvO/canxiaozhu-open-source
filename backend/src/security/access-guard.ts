import type { FastifyInstance } from 'fastify'
import { AuthService, type AuthUserDto } from '../services/auth-service.js'
import { AccessError, membershipsFor, requirePermission } from '../services/shop-access.js'

declare module 'fastify' { interface FastifyRequest { accessUser?: AuthUserDto } }
const routes: Record<string, string> = {
  '/shop/rename': 'shop:manage', '/shop/delete': 'shop:manage',
  '/dashboard/overview': 'dashboard', '/daily-report/get': 'daily-report',
  '/dining/tables': 'dining', '/dining/menu': 'dining', '/dining/orders': 'dining',
  '/customer/profile': 'customers', '/customer/assets/overview': 'customers',
  '/customer/coupon/send': 'customers:write', '/customer/notes/save': 'customers:write',
  '/dish/quadrant': 'dishes', '/purchase/order/generate': 'purchase',
  '/purchase/order/regenerate': 'purchase:confirm', '/purchase/order/confirm': 'purchase:confirm', '/purchase/order/export': 'export',
  '/review/aggregate': 'reviews', '/review/reply/open': 'reviews:write', '/review/handled': 'reviews:write',
  '/system/config': 'settings', '/system/config/save': 'settings', '/todo/dismiss': 'dashboard',
  '/inventory/overview': 'inventory', '/inventory/save': 'inventory:write', '/inventory/receive': 'inventory:write', '/inventory/mark-special': 'inventory:write',
  '/agent/qa': 'assistant', '/agent/qa/stream': 'assistant', '/voice/qa': 'dashboard', '/voice/qa/stream': 'dashboard',
}
export function registerAccessGuard(app: FastifyInstance) {
  const auth = new AuthService()
  app.addHook('preHandler', async request => {
    const path = request.routeOptions.url ?? ''
    if (!path.startsWith('/api/v2/')) return
    if (path === '/api/v2/health' || path.startsWith('/api/v2/public/') || path.startsWith('/api/v2/auth/')) return
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1]?.trim()
    if (!token) throw new AccessError('请先登录。', 401)
    request.accessUser = await auth.getUserByToken(token)
    const user = request.accessUser
    const short = path.slice('/api/v2'.length)
    if (['/shop/list', '/membership/accept', '/membership/context'].includes(short)) return
    if (short === '/shop/create') {
      if (!user.canCreateShop) throw new AccessError('只有老板可以新增门店。')
      return
    }
    if (short === '/chain/board') {
      if (!(await membershipsFor(user.id)).some(member => ['老板', '店长'].includes(member.role))) throw new AccessError('当前账号没有多店看板权限。')
      return
    }
    if (short.startsWith('/weather/')) return
    const body = request.body as Record<string, unknown> | null
    const shopId = Number(body?.shop_id ?? (request.query as Record<string, unknown>)?.shop_id)
    if (!Number.isSafeInteger(shopId) || shopId <= 0) throw new AccessError('请指定有效门店。', 400)
    let permission = routes[short]
    if (short.startsWith('/membership/')) permission = 'members:manage'
    if (short.startsWith('/agent/knowledge')) permission = request.method === 'GET' ? 'purchase' : 'knowledge:write'
    if (short === '/agent/status') permission = 'assistant'
    if (short === '/dining/orders/status') {
      const status = String(body?.status)
      permission = status === 'completed' ? 'payment:write' : 'dining:write'
      const member = await requirePermission(user.id, shopId, permission)
      if (member.role === '后厨' && !['accepted', 'cooking', 'served'].includes(status)) throw new AccessError('后厨只允许接单、制作和上桌。')
      return
    }
    if (!permission) throw new AccessError('此接口尚未配置访问权限。')
    await requirePermission(user.id, shopId, permission)
  })
}
