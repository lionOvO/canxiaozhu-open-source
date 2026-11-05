import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import type { Prisma } from '../../node_modules/.prisma/client/index.js'

export class AccessError extends Error {
  constructor(message: string, public statusCode = 403) { super(message); this.name = 'AccessError' }
}
export const roles = ['老板', '店长', '后厨', '收银'] as const
export type ShopRole = typeof roles[number]
const common = ['dining', 'assistant']
export const rolePermissions: Record<ShopRole, string[]> = {
  老板: [...common, 'dashboard', 'daily-report', 'customers', 'dishes', 'inventory', 'purchase', 'reviews', 'chain-board', 'settings', 'export', 'permission-admin', 'shops:create', 'shop:manage', 'members:manage', 'dining:write', 'payment:write', 'inventory:write', 'purchase:confirm', 'customers:write', 'reviews:write', 'knowledge:write'],
  店长: [...common, 'dashboard', 'daily-report', 'customers', 'dishes', 'inventory', 'purchase', 'reviews', 'chain-board', 'dining:write', 'payment:write', 'inventory:write', 'purchase:confirm', 'customers:write', 'reviews:write'],
  后厨: [...common, 'inventory', 'dining:write', 'inventory:write'],
  收银: [...common, 'customers', 'payment:write', 'customers:write'],
}
export const permissionsFor = (role: string): string[] => rolePermissions[role as ShopRole] ?? []
export const hashInvite = (code: string) => createHash('sha256').update(code.trim()).digest('hex')
let ready: Promise<void> | undefined

// Additive and idempotent migration. A marker prevents removed users being re-imported.
export function initializeMemberships() {
  return ready ??= (async () => {
    for (const sql of [
      `CREATE TABLE IF NOT EXISTS ShopMember (shopId INTEGER NOT NULL, userId TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(shopId,userId), FOREIGN KEY(shopId) REFERENCES Shop(id) ON DELETE CASCADE, FOREIGN KEY(userId) REFERENCES MerchantUser(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS ShopInvitation (id TEXT PRIMARY KEY NOT NULL, shopId INTEGER NOT NULL, role TEXT NOT NULL, codeHash TEXT NOT NULL UNIQUE, createdBy TEXT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, expiresAt DATETIME NOT NULL, revokedAt DATETIME, usedAt DATETIME, usedBy TEXT, FOREIGN KEY(shopId) REFERENCES Shop(id) ON DELETE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS MembershipMigration (userId TEXT PRIMARY KEY NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS PermissionAudit (id TEXT PRIMARY KEY NOT NULL, actorId TEXT NOT NULL, shopId INTEGER NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE INDEX IF NOT EXISTS ShopMember_userId_status_idx ON ShopMember(userId,status)`,
      `CREATE INDEX IF NOT EXISTS ShopInvitation_shopId_createdAt_idx ON ShopInvitation(shopId,createdAt)`,
      `CREATE INDEX IF NOT EXISTS PermissionAudit_shopId_createdAt_idx ON PermissionAudit(shopId,createdAt)`,
    ]) await prisma.$executeRawUnsafe(sql)
    const users = await prisma.merchantUser.findMany({ select: { id: true } })
    for (const user of users) await migrateUser(user.id)

  })().catch(error => { ready = undefined; throw error })
}

async function migrateUser(userId: string) {
  if (await prisma.membershipMigration.findUnique({ where: { userId } })) return
  await prisma.$transaction(async tx => {
    if (await tx.membershipMigration.findUnique({ where: { userId } })) return
    const user = await tx.merchantUser.findUnique({ where: { id: userId }, select: { role: true, assignedShopIds: true } })
    if (!user) return
    let ids: unknown = []
    try { ids = typeof user.assignedShopIds === 'string' ? JSON.parse(user.assignedShopIds) : user.assignedShopIds } catch { /* Invalid legacy scope grants nothing. */ }
    for (const shopId of Array.isArray(ids) ? ids.filter(Number.isSafeInteger) : []) {
      if (!await tx.shop.findUnique({ where: { id: shopId } })) continue
      await tx.shopMember.upsert({ where: { shopId_userId: { shopId, userId } }, create: { shopId, userId, role: user.role }, update: {} })
    }
    await tx.membershipMigration.create({ data: { userId } })
  })
}

export async function membershipsFor(userId: string) {
  await initializeMemberships()
  await migrateUser(userId)
  return prisma.shopMember.findMany({ where: { userId, status: 'active' }, include: { shop: { select: { name: true } } }, orderBy: { shopId: 'asc' } })
}
export async function requirePermission(userId: string, shopId: number, permission: string) {
  const membership = await prisma.shopMember.findUnique({ where: { shopId_userId: { shopId, userId } }, include: { user: { select: { status: true } } } })
  if (!membership || membership.user.status !== 'active' || membership.status !== 'active' || !permissionsFor(membership.role).includes(permission)) throw new AccessError('当前账号没有该门店的操作权限。')
  return membership
}
export function audit(tx: Prisma.TransactionClient, actorId: string, shopId: number, action: string, target: string) {
  return tx.permissionAudit.create({ data: { id: randomUUID(), actorId, shopId, action, target } })
}
export async function createShop(tx: Prisma.TransactionClient, userId: string, name: string, city = '上海', businessHours = '09:00 - 21:00') {
  if (name.trim().length < 2 || !city.trim() || !businessHours.trim()) throw new AccessError('请填写有效的门店名称、城市和营业时间。', 400)
  const max = await tx.shop.aggregate({ _max: { id: true } })
  const shop = await tx.shop.create({ data: { id: Math.max(4000, max._max.id ?? 0) + 1, name: name.trim(), brand: '我的餐厅', city: city.trim(), businessHours: businessHours.trim(), unreadCount: 0, realtimeOrders: 0, statusTone: 'success' } })
  await tx.systemConfigSnapshot.create({ data: { shopId: shop.id, payload: { employees: [], suppliers: [], knowledgeBase: [], permissions: [] } } })
  await tx.shopMember.create({ data: { shopId: shop.id, userId, role: '老板' } })
  await audit(tx, userId, shop.id, 'create-shop', shop.name)
  return shop
}
export async function claimInvitation(tx: Prisma.TransactionClient, userId: string, code: string) {
  const invite = await tx.shopInvitation.findUnique({ where: { codeHash: hashInvite(code) } })
  if (!invite || invite.revokedAt || invite.usedAt || invite.expiresAt <= new Date() || !['店长', '后厨', '收银'].includes(invite.role)) throw new AccessError('邀请码无效、已使用、已撤销或已过期。', 400)
  const existing = await tx.shopMember.findUnique({ where: { shopId_userId: { shopId: invite.shopId, userId } } })
  if (existing?.status === 'active') throw new AccessError('你已经是该门店的成员，无需重复加入。', 409)
  const result = await tx.shopInvitation.updateMany({ where: { id: invite.id, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date(), usedBy: userId } })
  if (result.count !== 1) throw new AccessError('邀请码已失效，请联系老板重新邀请。', 409)
  await tx.shopMember.upsert({ where: { shopId_userId: { shopId: invite.shopId, userId } }, create: { shopId: invite.shopId, userId, role: invite.role }, update: { role: invite.role, status: 'active' } })
  await audit(tx, userId, invite.shopId, 'accept-invitation', invite.id)
  return invite.shopId
}
export async function issueInvitation(actorId: string, shopId: number, role: string) {
  if (!['店长', '后厨', '收银'].includes(role)) throw new AccessError('只能邀请店长、后厨或收银。', 400)
  const code = randomBytes(24).toString('base64url')
  return prisma.$transaction(async tx => {
    const owner = await tx.shopMember.findUnique({ where: { shopId_userId: { shopId, userId: actorId } } })
    if (owner?.status !== 'active' || owner.role !== '老板') throw new AccessError('只有门店老板可以邀请员工。')
    const invitation = await tx.shopInvitation.create({ data: { id: randomUUID(), shopId, role, codeHash: hashInvite(code), createdBy: actorId, expiresAt: new Date(Date.now() + 7 * 86400000) } })
    await audit(tx, actorId, shopId, 'invite', invitation.id)
    return { id: invitation.id, code, role, expiresAt: invitation.expiresAt }
  })
}
