import type { FastifyInstance } from 'fastify'
import { Type } from 'typebox'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { prisma } from '../lib/prisma.js'
import { AccessError, audit, claimInvitation, createShop, issueInvitation, membershipsFor, permissionsFor } from '../services/shop-access.js'

const shop = Type.Integer({ minimum: 1 })
const staffRole = Type.Union([Type.Literal('店长'), Type.Literal('后厨'), Type.Literal('收银')])
const envelope = <T>(data: T) => ({ success: true, data })
export async function registerMembershipRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<TypeBoxTypeProvider>()
  server.get('/api/v2/public/invitation', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } }, schema: { querystring: Type.Object({ code: Type.String({ minLength: 20, maxLength: 80 }) }) } }, async request => {
    const { hashInvite } = await import('../services/shop-access.js')
    const invite = await prisma.shopInvitation.findUnique({ where: { codeHash: hashInvite(request.query.code) }, include: { shop: { select: { name: true } } } })
    if (!invite || invite.revokedAt || invite.usedAt || invite.expiresAt <= new Date()) throw new AccessError('邀请码无效、已使用、已撤销或已过期。', 400)
    return envelope({ shopName: invite.shop.name, role: invite.role, expiresAt: invite.expiresAt })
  })
  server.post('/api/v2/shop/create', { schema: { body: Type.Object({ name: Type.String({ minLength: 2, maxLength: 30 }), city: Type.String({ minLength: 1, maxLength: 40 }), business_hours: Type.String({ minLength: 1, maxLength: 60 }) }) } }, async request => {
    const userId = request.accessUser!.id
    const result = await prisma.$transaction(async tx => {
      if (!await tx.shopMember.findFirst({ where: { userId, role: '老板', status: 'active' } })) throw new AccessError('只有老板可以新增门店。')
      return createShop(tx, userId, request.body.name, request.body.city, request.body.business_hours)
    })
    return envelope(result)
  })
  server.post('/api/v2/membership/context', async request => envelope((await membershipsFor(request.accessUser!.id)).map(member => ({ shopId: member.shopId, shopName: member.shop.name, role: member.role, permissions: permissionsFor(member.role) }))))
  server.post('/api/v2/membership/accept', { schema: { body: Type.Object({ code: Type.String({ minLength: 20, maxLength: 80 }) }) } }, async request => envelope({ shopId: await prisma.$transaction(tx => claimInvitation(tx, request.accessUser!.id, request.body.code)) }))
  server.get('/api/v2/membership/team', { schema: { querystring: Type.Object({ shop_id: shop }) } }, async request => {
    const shopId = request.query.shop_id
    const [members, invitations, logs] = await Promise.all([
      prisma.shopMember.findMany({ where: { shopId, status: 'active' }, select: { userId: true, role: true, createdAt: true, user: { select: { account: true, displayName: true, phoneMask: true } } } }),
      prisma.shopInvitation.findMany({ where: { shopId }, select: { id: true, role: true, createdAt: true, expiresAt: true, revokedAt: true, usedAt: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.permissionAudit.findMany({ where: { shopId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    ])
    const userIds = [...new Set(logs.flatMap(log => [log.actorId, log.target.split(':')[0]!]))]
    const people = await prisma.merchantUser.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } })
    const names = new Map(people.map(person => [person.id, person.displayName]))
    const inviteRoles = new Map(invitations.map(invite => [invite.id, invite.role]))
    return envelope({ members, invitations: invitations.map(invite => ({ ...invite, status: invite.usedAt ? '已使用' : invite.revokedAt ? '已撤销' : invite.expiresAt <= new Date() ? '已过期' : '待接受' })), logs: logs.map(log => {
      const [targetId, nextRole] = log.target.split(':')
      const targetLabel = log.action === 'create-shop' ? log.target
        : ['change-role', 'remove-member'].includes(log.action) ? `${names.get(targetId!) ?? '原门店成员'}${nextRole ? ' → ' + nextRole : ''}`
        : `${inviteRoles.get(log.target) ?? '员工'}邀请`
      return { id: log.id, action: log.action, createdAt: log.createdAt, actorName: names.get(log.actorId) ?? '原门店成员', targetLabel }
    }) })
  })
  server.post('/api/v2/membership/invite', { schema: { body: Type.Object({ shop_id: shop, role: staffRole }) } }, async request => envelope(await issueInvitation(request.accessUser!.id, request.body.shop_id, request.body.role)))
  server.post('/api/v2/membership/revoke', { schema: { body: Type.Object({ shop_id: shop, id: Type.String({ minLength: 1 }) }) } }, async request => {
    await prisma.$transaction(async tx => {
      const changed = await tx.shopInvitation.updateMany({ where: { id: request.body.id, shopId: request.body.shop_id, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } })
      if (!changed.count) throw new AccessError('邀请已失效或不存在。', 409)
      await audit(tx, request.accessUser!.id, request.body.shop_id, 'revoke-invitation', request.body.id)
    })
    return envelope({ message: '邀请已撤销。' })
  })
  for (const action of ['role', 'remove'] as const) server.post(`/api/v2/membership/${action}`, { schema: { body: Type.Object({ shop_id: shop, user_id: Type.String({ minLength: 1 }), role: Type.Optional(staffRole) }) } }, async request => {
    const input = request.body
    await prisma.$transaction(async tx => {
      const actor = await tx.shopMember.findUnique({ where: { shopId_userId: { shopId: input.shop_id, userId: request.accessUser!.id } } })
      if (actor?.status !== 'active' || actor.role !== '老板') throw new AccessError('只有老板可以管理成员。')
      const member = await tx.shopMember.findUnique({ where: { shopId_userId: { shopId: input.shop_id, userId: input.user_id } } })
      if (!member || member.status !== 'active') throw new AccessError('成员不存在。', 404)
      if (member.role === '老板') throw new AccessError('不能移除或降低老板权限。')
      if (action === 'role' && !input.role) throw new AccessError('请选择员工角色。', 400)
      await tx.shopMember.update({ where: { shopId_userId: { shopId: input.shop_id, userId: input.user_id } }, data: action === 'remove' ? { status: 'removed' } : { role: input.role! } })
      await audit(tx, request.accessUser!.id, input.shop_id, action === 'remove' ? 'remove-member' : 'change-role', input.user_id + (input.role ? ':' + input.role : ''))
    })
    return envelope({ message: action === 'remove' ? '成员已移除。' : '角色已更新。' })
  })
}
