import { useAuthStore } from '@/stores/auth'
import { useMerchantStore } from '@/stores/merchant'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    {
      path: '/order/:token',
      name: 'customer-order',
      component: () => import('@/views/CustomerOrderView.vue'),
      meta: {
        title: '扫码点餐',
        description: '顾客桌码点餐页面',
      },
    },
    {
      path: '/',
      meta: { requiresAuth: true },
      component: () => import('@/components/mobile/MobileShell.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/HomeView.vue'),
          meta: {
            title: '经营总览',
            description: '查看利润、异常和今日重点事项',
          },
        },
        {
          path: 'report',
          name: 'daily-report',
          component: () => import('@/views/DailyReportView.vue'),
          meta: {
            title: 'AI 经营日报',
            description: '按趋势、异常和动作建议查看日报',
          },
        },
        {
          path: 'customers/:customerId?',
          name: 'customers',
          component: () => import('@/views/CustomersView.vue'),
          meta: {
            title: '客户资产',
            description: '查看客户跟进、召回和备注信息',
          },
        },
        {
          path: 'purchase',
          name: 'purchase',
          component: () => import('@/views/PurchaseView.vue'),
          meta: {
            title: '智能采购',
            description: '处理采购清单、供应商和执行动作',
          },
        },
        {
          path: 'inventory',
          name: 'inventory',
          component: () => import('@/views/InventoryView.vue'),
          meta: {
            title: '库存管理',
            description: '盘点现货、处理到货并同步采购建议',
          },
        },
        {
          path: 'dining',
          name: 'dining-orders',
          component: () => import('@/views/DiningOrdersView.vue'),
          meta: {
            title: '扫码点餐',
            description: '处理桌码订单、桌台二维码和顾客点餐菜单',
          },
        },
        {
          path: 'more',
          name: 'more',
          component: () => import('@/views/MoreView.vue'),
          meta: {
            title: '更多模块',
            description: '查看分析模块和后台配置',
          },
        },
        {
          path: 'dishes',
          name: 'dishes',
          component: () => import('@/views/DishesView.vue'),
          meta: {
            title: '菜品盈利',
            description: '查看菜品象限、菜单建议和成本提醒',
          },
        },
        {
          path: 'reviews',
          name: 'reviews',
          component: () => import('@/views/ReviewsView.vue'),
          meta: {
            title: '评价口碑',
            description: '查看待回复评价和口碑洞察',
          },
        },
        {
          path: 'chain-board',
          name: 'chain-board',
          component: () => import('@/views/ChainBoardView.vue'),
          meta: {
            title: '多店看板',
            description: '查看门店对比和统一动作建议',
          },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: {
            title: '系统配置',
            description: '管理数据源、团队权限和资产记录',
          },
        },
      ],
    },
  ],
})

router.beforeEach(async to => {
  if (!to.meta.requiresAuth) return true
  const auth = useAuthStore()
  try { await auth.refreshUser() } catch { auth.clearSession(); return { name: 'login', query: { redirect: to.fullPath } } }
  const store = useMerchantStore()
  const ids = auth.user?.assignedShopIds ?? []
  if (!ids.length) return { name: 'login', query: { noShop: '1' } }
  if (!ids.includes(store.selectedShopId)) { store.$reset(); await store.bootstrap() }
  const permission = to.name === 'dining-orders' ? 'dining' : String(to.name)
  if (to.name !== 'more' && !store.permissions.includes(permission)) return { name: store.permissions.includes('dashboard') ? 'dashboard' : 'dining-orders' }
  return true
})

let refreshingAccess = false
window.addEventListener('canteen-access-changed', () => {
  if (refreshingAccess || !sessionStorage.getItem('canteen-helper-auth-token')) return
  refreshingAccess = true
  void (async () => {
    const auth = useAuthStore()
    const store = useMerchantStore()
    try {
      await auth.refreshUser()
      if (!auth.user?.assignedShopIds.length) { store.$reset(); await router.replace({ name: 'login', query: { noShop: '1' } }); return }
      store.stopAssistantGeneration({ silent: true }); store.$reset(); await store.bootstrap()
      await router.replace('/')
    } catch { auth.clearSession(); store.$reset(); await router.replace('/login') }
    finally { refreshingAccess = false }
  })()
})

export default router
