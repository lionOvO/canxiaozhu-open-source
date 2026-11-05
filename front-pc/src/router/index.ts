import { useMerchantStore } from '@/stores/merchant'
import { useAuthStore } from '@/stores/auth'
import AppShell from '@/components/AppShell.vue'
import { createRouter, createWebHistory } from 'vue-router'

const ChainBoardView = () => import('@/views/ChainBoardView.vue')
const CustomersView = () => import('@/views/CustomersView.vue')
const DailyReportView = () => import('@/views/DailyReportView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')
const AssistantView = () => import('@/views/AssistantView.vue')
const DiningOrdersView = () => import('@/views/DiningOrdersView.vue')
const DishesView = () => import('@/views/DishesView.vue')
const InventoryView = () => import('@/views/InventoryView.vue')
const LoginView = () => import('@/views/LoginView.vue')
const PurchaseView = () => import('@/views/PurchaseView.vue')
const RegisterView = () => import('@/views/RegisterView.vue')
const ReviewsView = () => import('@/views/ReviewsView.vue')
const SettingsView = () => import('@/views/SettingsView.vue')
const WechatCallbackView = () => import('@/views/WechatCallbackView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    // Customer selection and query filters keep their place within a module.
    if (to.name === from.name) return false
    return { top: 0, left: 0, behavior: 'instant' }
  },
  routes: [
    { path: '/join', name: 'join', component: () => import('@/views/JoinView.vue'), meta: { title: '加入门店' } },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        guestOnly: true,
        title: '登录餐小助',
      },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: {
        guestOnly: true,
        title: '注册餐小助',
      },
    },
    {
      path: '/wechat/callback',
      name: 'wechat-callback',
      component: WechatCallbackView,
      meta: {
        guestOnly: true,
        allowAuthenticatedGuest: true,
        title: '微信登录餐小助',
      },
    },
    {
      path: '/',
      component: AppShell,
      redirect: '/dashboard',
      meta: {
        requiresAuth: true,
      },
      children: [
        { path: 'team', name: 'team', component: () => import('@/views/TeamView.vue'), meta: { title: '门店与成员', description: '新增门店，邀请员工，并管理每家门店的岗位权限。' } },
        {
          path: 'assistant', name: 'assistant', component: AssistantView,
          meta: { title: 'AI 经营助手', description: '查经营数据，核对补货建议，找到每条建议的依据。' },
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: DashboardView,
          meta: {
            title: '经营驾驶舱',
            description: '3 秒看清昨日利润、异常事项和今天优先动作。',
          },
        },
        {
          path: 'dining',
          name: 'dining',
          component: DiningOrdersView,
          meta: {
            title: '扫码点餐',
            description: '管理桌码、顾客扫码订单和堂食出餐状态。',
          },
        },
        {
          path: 'report',
          name: 'daily-report',
          component: DailyReportView,
          meta: {
            title: 'AI 经营日报',
            description: '营收、利润、异常归因和今日行动建议。',
          },
        },
        {
          path: 'customers/:customerId?',
          name: 'customers',
          component: CustomersView,
          meta: {
            title: '客户资产管家',
            description: '把分散客户沉淀为可运营、可召回的门店资产。',
          },
        },
        {
          path: 'dishes',
          name: 'dishes',
          component: DishesView,
          meta: {
            title: '菜品盈利分析',
            description: '用销量和毛利四象限重排菜单结构。',
          },
        },
        {
          path: 'inventory',
          name: 'inventory',
          component: InventoryView,
          meta: {
            title: '库存管理',
            description: '盘点现货、跟踪在途，并让采购建议自动扣除可用库存。',
          },
        },
        {
          path: 'purchase',
          name: 'purchase',
          component: PurchaseView,
          meta: {
            title: '智能采购单',
            description: 'AI 算账后，老板只做最后确认。',
          },
        },
        {
          path: 'reviews',
          name: 'reviews',
          component: ReviewsView,
          meta: {
            title: '评价口碑',
            description: '聚合多平台评价，生成可执行的回复和整改动作。',
          },
        },
        {
          path: 'chain-board',
          name: 'chain-board',
          component: ChainBoardView,
          meta: {
            title: '多店看板',
            description: '连锁门店排名、横向对比和异常标红。',
          },
        },
        {
          path: 'settings',
          name: 'settings',
          component: SettingsView,
          meta: {
            title: '系统管理',
            description: '管理门店、员工、菜品、供应商和数据接入配置。',
          },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const restored = await authStore.restoreSession()

  if (to.meta.requiresAuth && !restored) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath,
      },
    }
  }

  if (to.meta.requiresAuth && restored) {
    try { await authStore.refreshUser() } catch { authStore.clearSession(); return { name: 'login' } }
    const merchant = useMerchantStore()
    const ids = authStore.user?.assignedShopIds ?? []
    if (!ids.length) { merchant.$reset(); return { name: 'join' } }
    if (!ids.includes(merchant.selectedShopId)) {
      merchant.$reset()
      await merchant.bootstrap()
    }
    const permission = to.name === 'team' ? 'members:manage' : String(to.name)
    if (!merchant.permissions.includes(permission)) return { name: merchant.permissions.includes('dashboard') ? 'dashboard' : 'dining' }
  }

  if (to.meta.guestOnly && restored && !to.meta.allowAuthenticatedGuest) {
    return { name: 'dashboard' }
  }

  return true
})

let refreshingAccess = false
window.addEventListener('canteen-access-changed', () => {
  const auth = useAuthStore()
  if (refreshingAccess || !auth.token) return
  refreshingAccess = true
  void (async () => {
    const store = useMerchantStore()
    const previousScope = JSON.stringify(auth.user?.memberships)
    try {
      await auth.refreshUser()
      const ids = auth.user?.assignedShopIds ?? []
      if (!ids.length) { store.$reset(); await router.replace('/join'); return }
      const shopId = ids.includes(store.selectedShopId) ? store.selectedShopId : auth.user!.defaultShopId
      if (JSON.stringify(auth.user?.memberships) !== previousScope) {
        store.stopAssistantGeneration({ silent: true }); store.$reset(); await store.bootstrap(); await store.setSelectedShop(shopId)
      }
      const route = router.currentRoute.value
      const permission = route.name === 'team' ? 'members:manage' : String(route.name)
      if (route.meta.requiresAuth && !store.permissions.includes(permission)) await router.replace({ name: store.permissions.includes('dashboard') ? 'dashboard' : 'dining' })
    } catch {
      auth.clearSession(); store.$reset(); await router.replace({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    } finally { refreshingAccess = false }
  })()
})

export default router
