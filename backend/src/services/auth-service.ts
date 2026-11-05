import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import { hashPassword, verifyPassword } from './password.js'
import type { SystemConfigData } from '../domain/types.js'
import { initializeMemberships, membershipsFor, permissionsFor, claimInvitation, createShop } from './shop-access.js'

const shopModel = prisma.shop as any
const authSessionModel = prisma.authSession as any
const loginAuditLogModel = prisma.loginAuditLog as any

const SESSION_DAYS = 7
const DEMO_PASSWORD = 'canteen2026'
const ACCOUNT_PATTERN = /^[\p{Script=Han}A-Za-z0-9_-]{2,32}$/u
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^1[3-9]\d{9}$/
const WECHAT_STATE_TTL_MS = 10 * 60 * 1000
const wechatLoginStates = new Map<string, { createdAt: number; redirectPath: string }>()
let authSchemaReady: Promise<void> | null = null

interface MerchantUserRecord {
  id: string
  account: string
  email: string | null
  phone: string | null
  wechatOpenId: string | null
  wechatUnionId: string | null
  wechatNickname: string | null
  wechatAvatar: string | null
  displayName: string
  role: string
  phoneMask: string | null
  passwordHash: string
  passwordSalt: string
  status: string
  assignedShopIds: unknown
  defaultShopId: number
  lastLoginAt: Date | string | null
}

export interface AuthUserDto {
  memberships: Array<{ shopId: number; shopName: string; role: string; permissions: string[] }>
  canCreateShop: boolean
  id: string
  account: string
  email?: string
  displayName: string
  role: string
  phoneMask?: string
  assignedShopIds: number[]
  defaultShopId: number
  permissions: string[]
  lastLoginAt?: string
}

export interface LoginResult {
  token: string
  expiresAt: string
  user: AuthUserDto
}

export interface RegisterInput {
  inviteCode?: string
  account: string
  phone: string
  email?: string
  password: string
  displayName?: string
  ip?: string
  userAgent?: string
}

export interface WechatLoginUrlResult {
  authUrl: string
  state: string
  expiresIn: number
}

interface WechatTokenResponse {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  openid?: string
  scope?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

interface WechatUserInfoResponse {
  openid?: string
  nickname?: string
  headimgurl?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

export class AuthError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 401) {
    super(message)
    this.name = 'AuthError'
    this.statusCode = statusCode
  }
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function createSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

function createWechatState(): string {
  return randomBytes(18).toString('base64url')
}

function cleanExpiredWechatStates(): void {
  const now = Date.now()
  for (const [state, entry] of wechatLoginStates) {
    if (now - entry.createdAt > WECHAT_STATE_TTL_MS) {
      wechatLoginStates.delete(state)
    }
  }
}

function normalizeRedirectPath(value?: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard'
  }

  if (value.startsWith('/login') || value.startsWith('/register') || value.startsWith('/wechat/callback')) {
    return '/dashboard'
  }

  return value
}

function normalizeAssignedShopIds(value: unknown): number[] {
  if (typeof value === 'string') {
    try {
      return normalizeAssignedShopIds(JSON.parse(value))
    } catch {
      return []
    }
  }

  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is number => typeof item === 'number')
}

function validatePassword(password: string): void {
  if (password.length < 8 || password.length > 64) {
    throw new AuthError('密码长度需为 8-64 位。', 400)
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new AuthError('密码需同时包含字母和数字。', 400)
  }
}

function normalizeAccount(account: string): string {
  const normalized = account.trim()
  if (!ACCOUNT_PATTERN.test(normalized)) {
    throw new AuthError('用户名长度需为 2-32 位，支持中文、字母、数字、下划线和短横线。', 400)
  }

  return normalized
}

function normalizeEmail(email?: string): string | null {
  if (!email?.trim()) {
    return null
  }

  const normalized = email.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(normalized) || normalized.length > 120) {
    throw new AuthError('请输入有效的电子邮箱。', 400)
  }

  return normalized
}

function normalizePhone(phone: string): string {
  const normalized = phone.trim()
  if (!PHONE_PATTERN.test(normalized)) {
    throw new AuthError('请输入有效的中国大陆手机号。', 400)
  }

  return normalized
}

function maskPhone(phone: string): string {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

async function ensureMerchantUserAuthColumns(): Promise<void> {
  if (authSchemaReady) {
    return authSchemaReady
  }

  authSchemaReady = (async () => {
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      'PRAGMA table_info(MerchantUser)',
    )
    const columnNames = new Set(columns.map((column: { name: string }) => column.name))
    const optionalTextColumns = [
      'wechatOpenId',
      'wechatUnionId',
      'wechatNickname',
      'wechatAvatar',
    ]

    for (const column of optionalTextColumns) {
      if (!columnNames.has(column)) {
        await prisma.$executeRawUnsafe(`ALTER TABLE MerchantUser ADD COLUMN ${column} TEXT`)
      }
    }
  })()

  return authSchemaReady
}

function createEmptySystemConfig(ownerName: string): SystemConfigData {
  return {
    dataSources: [],
    employees: [
      {
        id: 1,
        name: ownerName,
        role: '老板',
        shift: '未设置班次',
        permissionLevel: '全部权限',
      },
    ],
    dishes: [],
    suppliers: [],
    knowledgeBase: [],
    exportLogs: [],
    permissions: [
      {
        role: '老板',
        scope: ['经营总览', '扫码点餐', 'AI 经营日报', '客户资产', '菜品盈利', '采购单', '评价口碑', '系统配置'],
      },
    ],
  }
}

async function nextPersonalShopId(): Promise<number> {
  const latest = await shopModel.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true },
  })

  return Math.max(10_000, Number(latest?.id ?? 9_999) + 1)
}

async function createEmptyPersonalShop(input: {
  account: string
  displayName: string
}): Promise<{ id: number }> {
  const shopName = `${input.displayName}的门店`
  const now = new Date()

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shopId = (await nextPersonalShopId()) + attempt

    try {
      await shopModel.create({
        data: {
          id: shopId,
          name: shopName,
          brand: '我的餐厅',
          city: '上海',
          businessHours: '09:00 - 21:00',
          unreadCount: 0,
          realtimeOrders: 0,
          statusTone: 'success',
        },
      })

      await prisma.systemConfigSnapshot.create({
        data: {
          shopId,
          payload: createEmptySystemConfig(input.displayName) as unknown as object,
          updatedAt: now,
        },
      })

      return { id: shopId }
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error
      }
    }
  }

  throw new AuthError('门店初始化失败，请稍后重试。', 500)
}

async function toUserDto(user: {
  id: string
  account: string
  email: string | null
  displayName: string
  role: string
  phoneMask: string | null
  assignedShopIds: unknown
  defaultShopId: number
  lastLoginAt: Date | string | null
}): Promise<AuthUserDto> {
  const memberships = (await membershipsFor(user.id)).map(member => ({ shopId: member.shopId, shopName: member.shop.name, role: member.role, permissions: permissionsFor(member.role) }))
  const primary = memberships.find(member => member.shopId === user.defaultShopId) ?? memberships[0]
  const lastLoginAt =
    user.lastLoginAt instanceof Date
      ? user.lastLoginAt.toISOString()
      : typeof user.lastLoginAt === 'string'
        ? new Date(user.lastLoginAt).toISOString()
        : undefined

  return {
    id: user.id,
    account: user.account,
    ...(user.email ? { email: user.email } : {}),
    displayName: user.displayName,
    role: primary?.role ?? '无门店',
    ...(user.phoneMask ? { phoneMask: user.phoneMask } : {}),
    assignedShopIds: memberships.map(member => member.shopId),
    defaultShopId: primary?.shopId ?? 0,
    permissions: primary?.permissions ?? [],
    memberships,
    canCreateShop: memberships.some(member => member.role === '老板'),
    ...(lastLoginAt ? { lastLoginAt } : {}),
  }
}

async function countMerchantUsers(): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number | bigint }>>(
    'SELECT COUNT(*) as count FROM MerchantUser',
  )
  const count = rows[0]?.count ?? 0
  return typeof count === 'bigint' ? Number(count) : count
}

async function findUserById(id: string): Promise<MerchantUserRecord | null> {
  const rows = await prisma.$queryRawUnsafe<MerchantUserRecord[]>(
    'SELECT * FROM MerchantUser WHERE id = ? LIMIT 1',
    id,
  )
  return rows[0] ?? null
}

async function findUserByLogin(account: string): Promise<MerchantUserRecord | null> {
  const rows = await prisma.$queryRawUnsafe<MerchantUserRecord[]>(
    'SELECT * FROM MerchantUser WHERE account = ? OR email = ? OR phone = ? LIMIT 1',
    account,
    account.toLowerCase(),
    account,
  )
  return rows[0] ?? null
}

async function findUserByWechat(openId: string, unionId?: string): Promise<MerchantUserRecord | null> {
  const rows = unionId
    ? await prisma.$queryRawUnsafe<MerchantUserRecord[]>(
        'SELECT * FROM MerchantUser WHERE wechatOpenId = ? OR wechatUnionId = ? LIMIT 1',
        openId,
        unionId,
      )
    : await prisma.$queryRawUnsafe<MerchantUserRecord[]>(
        'SELECT * FROM MerchantUser WHERE wechatOpenId = ? LIMIT 1',
        openId,
      )

  return rows[0] ?? null
}

async function findExistingUser(account: string, phone: string): Promise<MerchantUserRecord | null> {
  const rows = await prisma.$queryRawUnsafe<MerchantUserRecord[]>(
    'SELECT * FROM MerchantUser WHERE account = ? OR phone = ? LIMIT 1',
    account,
    phone,
  )
  return rows[0] ?? null
}

async function createMerchantUser(data: {
  account: string
  email: string | null
  phone: string | null
  wechatOpenId?: string | null
  wechatUnionId?: string | null
  wechatNickname?: string | null
  wechatAvatar?: string | null
  displayName: string
  role: string
  phoneMask: string
  passwordHash: string
  passwordSalt: string
  status?: string
  assignedShopIds: number[]
  defaultShopId: number
}): Promise<MerchantUserRecord> {
  const id = `user_${randomUUID()}`
  const now = new Date().toISOString()

  await prisma.$executeRawUnsafe(
    `INSERT INTO MerchantUser
      (id, account, email, phone, wechatOpenId, wechatUnionId, wechatNickname, wechatAvatar, displayName, role, phoneMask, passwordHash, passwordSalt, status, assignedShopIds, defaultShopId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    data.account,
    data.email,
    data.phone,
    data.wechatOpenId ?? null,
    data.wechatUnionId ?? null,
    data.wechatNickname ?? null,
    data.wechatAvatar ?? null,
    data.displayName,
    data.role,
    data.phoneMask,
    data.passwordHash,
    data.passwordSalt,
    data.status ?? 'active',
    JSON.stringify(data.assignedShopIds),
    data.defaultShopId,
    now,
    now,
  )

  const createdUser = await findUserById(id)
  if (!createdUser) {
    throw new AuthError('账号创建失败，请稍后重试。', 500)
  }

  return createdUser
}

async function createWechatUser(data: {
  openId: string
  unionId?: string
  nickname?: string
  avatar?: string
  ip?: string
  userAgent?: string
}): Promise<MerchantUserRecord> {
  const password = hashPassword(randomBytes(24).toString('base64url'))
  let suffix = data.openId.slice(-8) || randomBytes(4).toString('hex')
  const displayName = data.nickname?.trim() || `微信用户${suffix}`
  let account = `wx_${suffix}`

  for (let index = 0; index < 4; index += 1) {
    const existing = await findUserByLogin(account)
    if (!existing) {
      break
    }

    suffix = randomBytes(4).toString('hex')
    account = `wx_${suffix}`
  }

  const personalShop = await createEmptyPersonalShop({
    account,
    displayName,
  })

  return createMerchantUser({
    account,
    email: null,
    phone: null,
    wechatOpenId: data.openId,
    wechatUnionId: data.unionId ?? null,
    wechatNickname: data.nickname ?? null,
    wechatAvatar: data.avatar ?? null,
    displayName,
    role: '老板',
    phoneMask: '微信登录',
    passwordHash: password.hash,
    passwordSalt: password.salt,
    status: 'active',
    assignedShopIds: [personalShop.id],
    defaultShopId: personalShop.id,
  })
}

async function requestWechatJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new AuthError('微信登录服务暂时不可用，请稍后重试。', 503)
  }

  return response.json() as Promise<T>
}

async function updateLastLoginAt(userId: string): Promise<MerchantUserRecord> {
  const now = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    'UPDATE MerchantUser SET lastLoginAt = ?, updatedAt = ? WHERE id = ?',
    now,
    now,
    userId,
  )

  const updatedUser = await findUserById(userId)
  if (!updatedUser) {
    throw new AuthError('登录会话创建失败，请重新登录。', 500)
  }

  return updatedUser
}

async function createDemoUser(data: {
  account: string
  email: string
  phone: string
  displayName: string
  role: string
  assignedShopIds: number[]
  defaultShopId: number
}) {
  const password = hashPassword(DEMO_PASSWORD)

  await createMerchantUser({
    ...data,
    phoneMask: maskPhone(data.phone),
    passwordHash: password.hash,
    passwordSalt: password.salt,
  })
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}

export class AuthService {
  async ensureDemoUsers(): Promise<void> {
    await ensureMerchantUserAuthColumns()

    const existingUsers = await countMerchantUsers()
    if (existingUsers > 0) {
      return
    }

    await createDemoUser({
      account: 'laowang',
      email: 'laowang@example.com',
      phone: '13800005678',
      displayName: '老王',
      role: '老板',
      assignedShopIds: [3001, 3002, 3003],
      defaultShopId: 3001,
    })

    await createDemoUser({
      account: 'manager',
      email: 'manager@example.com',
      phone: '13900009021',
      displayName: '李店长',
      role: '店长',
      assignedShopIds: [3001, 3002],
      defaultShopId: 3001,
    })

    await createDemoUser({
      account: 'kitchen',
      email: 'kitchen@example.com',
      phone: '13700001138',
      displayName: '阿强',
      role: '后厨',
      assignedShopIds: [3001],
      defaultShopId: 3001,
    })

    await createDemoUser({
      account: 'cashier',
      email: 'cashier@example.com',
      phone: '13600008866',
      displayName: '阿梅',
      role: '收银',
      assignedShopIds: [3001],
      defaultShopId: 3001,
    })
  }

  async login(input: {
    account: string
    password: string
    ip?: string
    userAgent?: string
  }): Promise<LoginResult> {
    await ensureMerchantUserAuthColumns()
    await this.ensureDemoUsers()

    const account = input.account.trim()
    const user = await findUserByLogin(account)

    const validUser =
      user && user.status === 'active' && verifyPassword(input.password, user.passwordHash, user.passwordSalt)

    await loginAuditLogModel.create({
      data: {
        account,
        ...(input.ip ? { ip: input.ip } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        ...(user ? { user: { connect: { id: user.id } } } : {}),
        success: Boolean(validUser),
        reason: validUser ? '登录成功' : '账号或密码错误',
      },
    })

    if (!validUser) {
      throw new AuthError('账号或密码不正确，请检查后再登录。')
    }

    return this.createLoginSession(user)
  }

  async register(input: RegisterInput): Promise<LoginResult> {
    await ensureMerchantUserAuthColumns()
    await this.ensureDemoUsers()

    const account = normalizeAccount(input.account)
    const email = normalizeEmail(input.email)
    const phone = normalizePhone(input.phone)
    const displayName = input.displayName?.trim() || account
    validatePassword(input.password)

    const existingUser = await findExistingUser(account, phone)

    if (existingUser) {
      throw new AuthError('用户名或手机号已被注册，请换一个再试。', 409)
    }

    const password = hashPassword(input.password)
    await initializeMemberships()

    try {
      const user = await prisma.$transaction(async tx => {
        const created = await tx.merchantUser.create({ data: { account, email, phone, displayName,
          role: input.inviteCode ? '员工' : '老板', phoneMask: maskPhone(phone), passwordHash: password.hash,
          passwordSalt: password.salt, status: 'active', assignedShopIds: [], defaultShopId: 0 } })
        const shopId = input.inviteCode
          ? await claimInvitation(tx, created.id, input.inviteCode)
          : (await createShop(tx, created.id, `${displayName}的门店`)).id
        await tx.membershipMigration.create({ data: { userId: created.id } })
        return tx.merchantUser.update({ where: { id: created.id }, data: { assignedShopIds: [shopId], defaultShopId: shopId } })
      })

      await loginAuditLogModel.create({
        data: {
          user: { connect: { id: user.id } },
          account,
          ...(input.ip ? { ip: input.ip } : {}),
          ...(input.userAgent ? { userAgent: input.userAgent } : {}),
          success: true,
          reason: '注册成功并自动登录',
        },
      })

      return this.createLoginSession(user)
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AuthError('用户名或手机号已被注册，请换一个再试。', 409)
      }

      throw error
    }
  }

  createWechatLoginUrl(redirectPath?: string): WechatLoginUrlResult {
    if (!env.wechatLoginAppId || !env.wechatLoginRedirectUri) {
      throw new AuthError('微信扫码登录未配置，请先填写 WECHAT_LOGIN_APP_ID 和 WECHAT_LOGIN_REDIRECT_URI。', 503)
    }

    cleanExpiredWechatStates()
    const state = createWechatState()
    wechatLoginStates.set(state, {
      createdAt: Date.now(),
      redirectPath: normalizeRedirectPath(redirectPath),
    })

    const params = new URLSearchParams({
      appid: env.wechatLoginAppId,
      redirect_uri: env.wechatLoginRedirectUri,
      response_type: 'code',
      scope: 'snsapi_login',
      state,
    })

    return {
      authUrl: `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`,
      state,
      expiresIn: Math.floor(WECHAT_STATE_TTL_MS / 1000),
    }
  }

  async loginWithWechatCode(input: {
    code: string
    state: string
    ip?: string
    userAgent?: string
  }): Promise<LoginResult & { redirectPath: string }> {
    await ensureMerchantUserAuthColumns()

    if (!env.wechatLoginAppId || !env.wechatLoginAppSecret) {
      throw new AuthError('微信扫码登录未配置，请先填写 WECHAT_LOGIN_APP_ID 和 WECHAT_LOGIN_APP_SECRET。', 503)
    }

    cleanExpiredWechatStates()
    const stateEntry = wechatLoginStates.get(input.state)
    if (!stateEntry) {
      throw new AuthError('微信登录状态已过期，请回到登录页重新扫码。', 400)
    }
    wechatLoginStates.delete(input.state)

    const tokenParams = new URLSearchParams({
      appid: env.wechatLoginAppId,
      secret: env.wechatLoginAppSecret,
      code: input.code,
      grant_type: 'authorization_code',
    })
    const token = await requestWechatJson<WechatTokenResponse>(
      `https://api.weixin.qq.com/sns/oauth2/access_token?${tokenParams.toString()}`,
    )

    if (token.errcode || !token.openid || !token.access_token) {
      throw new AuthError(`微信授权失败：${token.errmsg ?? '请重新扫码授权。'}`, 401)
    }

    const userInfoParams = new URLSearchParams({
      access_token: token.access_token,
      openid: token.openid,
    })
    const userInfo = await requestWechatJson<WechatUserInfoResponse>(
      `https://api.weixin.qq.com/sns/userinfo?${userInfoParams.toString()}`,
    )
    const unionId = userInfo.unionid ?? token.unionid
    const existingUser = await findUserByWechat(token.openid, unionId)
    const user = existingUser ?? await createWechatUser({
      openId: token.openid,
      ...(unionId ? { unionId } : {}),
      ...(userInfo.nickname ? { nickname: userInfo.nickname } : {}),
      ...(userInfo.headimgurl ? { avatar: userInfo.headimgurl } : {}),
      ...(input.ip ? { ip: input.ip } : {}),
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    })

    await loginAuditLogModel.create({
      data: {
        user: { connect: { id: user.id } },
        account: user.account,
        ...(input.ip ? { ip: input.ip } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        success: true,
        reason: existingUser ? '微信扫码登录成功' : '微信扫码注册并登录成功',
      },
    })

    return {
      ...(await this.createLoginSession(user)),
      redirectPath: stateEntry.redirectPath,
    }
  }

  async createLoginSession(user: {
    id: string
    account: string
    email: string | null
    displayName: string
    role: string
    phoneMask: string | null
    assignedShopIds: unknown
    defaultShopId: number
    lastLoginAt: Date | string | null
  }): Promise<LoginResult> {
    const token = createSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

    await authSessionModel.create({
      data: {
        userId: user.id,
        tokenHash: tokenHash(token),
        expiresAt,
      },
    })

    const updatedUser = await updateLastLoginAt(user.id)

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: await toUserDto(updatedUser),
    }
  }

  async getUserByToken(token: string): Promise<AuthUserDto> {
    const session = await authSessionModel.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: true },
    })

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new AuthError('登录状态已失效，请重新登录。')
    }
    if (session.user.status !== 'active') throw new AuthError('账号已停用，请联系门店老板。', 403)

    await authSessionModel.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    })

    return toUserDto(session.user)
  }

  async logout(token: string): Promise<{ status: 'success'; message: string }> {
    await authSessionModel.updateMany({
      where: {
        tokenHash: tokenHash(token),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })

    return {
      status: 'success',
      message: '已安全退出登录。',
    }
  }
}
