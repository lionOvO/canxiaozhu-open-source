<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

interface DemoAccount {
  account: string
  name: string
  role: string
  scope: string
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = reactive({
  account: 'laowang',
  password: 'canteen2026',
})

const errorMessage = ref('')
const successMessage = ref('')
const passwordVisible = ref(false)

const demoAccounts: DemoAccount[] = [
  { account: 'laowang', name: '老王', role: '老板', scope: '全店经营与多店对比' },
  { account: 'manager', name: '李店长', role: '店长', scope: '日报、采购与评价管理' },
  { account: 'kitchen', name: '阿强', role: '后厨', scope: '接单出餐与库存盘点' },
  { account: 'cashier', name: '阿梅', role: '收银', scope: '收银结单与客户跟进' },
]

const features = [
  { title: '经营一目了然', description: '营收、利润、菜品毛利，多店表现一起看。', icon: 'M4 19.5h16 M7 16v-5 M12 16V5 M17 16V8' },
  { title: '点餐出餐有序', description: '顾客扫码下单，门店接单、出餐及时跟进。', icon: 'M8 4H5v16h14V4h-3 M9 3h6v4H9z M8 12h8 M8 16h5' },
  { title: '库存采购联动', description: '掌握现货与在途，参考补货建议确认采购。', icon: 'm3 7 9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7 M12 11v10 M7.5 5l9 4' },
  { title: 'AI 辅助决策', description: '生成经营日报、评价回复，梳理今日行动。', icon: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z' },
]

const passwordInputType = computed(() => (passwordVisible.value ? 'text' : 'password'))

function fillDemoAccount(account: string) {
  form.account = account
  form.password = 'canteen2026'
  errorMessage.value = ''
  successMessage.value = ''
}

async function submitLogin() {
  const account = form.account.trim()
  const password = form.password.trim()

  if (!account || !password) {
    errorMessage.value = '请输入账号和密码。'
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  try {
    await authStore.login(account, password)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//') && !route.query.redirect.includes('\\') ? route.query.redirect : '/dashboard'
    await router.replace(redirect)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败，请稍后重试。'
  }
}

onMounted(() => {
  if (route.query.registered === '1') {
    const account = typeof route.query.account === 'string' ? route.query.account : ''
    if (account) {
      form.account = account
      form.password = ''
    }
    successMessage.value = '账号创建成功，请输入密码登录餐小助。'
  }
})
</script>

<template>
  <main class="login-page">
    <section class="login-hero rise-in" aria-labelledby="intro-title">
      <div class="hero-brand">
        <div class="steam-badge" aria-hidden="true">餐</div>
        <div>
          <strong>餐小助</strong>
          <span>餐饮门店的日常经营助手</span>
        </div>
      </div>

      <div class="hero-copy">
        <h1 id="intro-title"><span>把门店日常，</span><span>经营得更有章法。</span></h1>
        <p>
          看清每天赚多少，跟进每一餐订单，备好下一餐食材。<br class="desktop-break" />
          从门店日常到经营决策，餐小助陪你一起打理。
        </p>
      </div>

      <div class="feature-grid" aria-label="功能亮点">
        <article v-for="feature in features" :key="feature.title" class="feature-item">
          <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="feature.icon" />
          </svg>
          <h2>{{ feature.title }}</h2>
          <p>{{ feature.description }}</p>
        </article>
      </div>

      <div class="daily-guide">
        <p>从开店到收店，都有好帮手</p>
        <ol>
          <li><span>开店前</span><strong>看经营 · 备食材</strong></li>
          <li><span>营业中</span><strong>接订单 · 跟出餐</strong></li>
          <li><span>收店后</span><strong>看日报 · 理评价</strong></li>
        </ol>
        <p class="more-features">也能帮你：客户管理 · 菜品分析 · 多店对比</p>
      </div>
    </section>

    <section class="login-card panel panel-strong rise-in stagger-2" aria-labelledby="login-title">
      <div class="card-header">
        <div>
          <p class="eyebrow">欢迎回来</p>
          <h2 id="login-title">登录餐小助</h2>
          <p>登录后，开始打理今天的门店经营。</p>
        </div>
      </div>

      <form class="login-form" @submit.prevent="submitLogin">
        <label class="field-block">
          <span>账号 / 邮箱 / 手机号</span>
          <input
            v-model="form.account"
            autocomplete="username"
            placeholder="请输入账号 / 邮箱 / 手机号"
          />
        </label>

        <label class="field-block">
          <span>密码</span>
          <div class="password-field">
            <input
              v-model="form.password"
              :type="passwordInputType"
              autocomplete="current-password"
              placeholder="请输入密码"
            />
            <button type="button" @click="passwordVisible = !passwordVisible">
              {{ passwordVisible ? '隐藏' : '显示' }}
            </button>
          </div>
        </label>

        <div v-if="errorMessage" class="login-error" role="alert">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="login-success" role="status">
          {{ successMessage }}
        </div>

        <button class="button-primary login-submit" type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? '正在校验账号...' : '进入经营后台' }}
        </button>
      </form>

      <div class="register-link">
        还没有账号？
        <RouterLink to="/register">创建一个商户账号</RouterLink>
      </div>

      <div class="demo-panel">
        <div class="demo-title">
          <span>演示账号</span>
          <small>默认密码：canteen2026</small>
        </div>

        <div class="demo-accounts">
          <button
            v-for="item in demoAccounts"
            :key="item.account"
            class="demo-account"
            type="button"
            @click="fillDemoAccount(item.account)"
          >
            <span class="demo-account-name">
              <strong>{{ item.name }}<small>{{ item.role }}</small></strong>
              <em>{{ item.account }}</em>
            </span>
            <small>{{ item.scope }}</small>
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(400px, 460px);
  align-items: center;
  gap: clamp(40px, 5vw, 88px);
  max-width: 1320px;
  margin: 0 auto;
  min-height: 100vh;
  min-height: 100svh;
  padding: 40px;
  overflow: hidden;
}

.login-page::before,
.login-page::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.login-page::before {
  inset: 22px auto auto 26px;
  width: 52vw;
  height: 52vw;
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(255, 107, 53, 0.09), transparent 58%),
    radial-gradient(circle at 30% 20%, rgba(255, 202, 122, 0.16), transparent 42%);
  filter: blur(6px);
}

.login-page::after {
  right: 8%;
  bottom: -14%;
  width: 360px;
  height: 360px;
  border-radius: 999px;
  background: rgba(0, 200, 83, 0.1);
}

.login-hero,
.login-card {
  position: relative;
  z-index: 1;
}

.login-hero {
  display: grid;
  align-content: center;
  gap: 26px;
  padding: 12px 0;
}

.hero-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hero-brand > div:last-child {
  display: grid;
  gap: 2px;
}

.hero-brand strong {
  font-size: 22px;
  letter-spacing: 0.06em;
}

.hero-brand span {
  font-size: 12px;
  color: var(--text-secondary);
}

.steam-badge {
  display: grid;
  place-items: center;
  flex: 0 0 52px;
  height: 52px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--accent-primary), #ff9a5c);
  box-shadow: 0 8px 20px rgba(255, 107, 53, 0.16);
  color: #ffffff;
  font-family: var(--display-font);
  font-size: 28px;
  font-weight: 800;
}

.hero-copy {
  max-width: 600px;
}

.hero-copy h1 {
  margin: 0 0 16px;
  font-family: var(--body-font);
  font-size: clamp(34px, 3.2vw, 46px);
  font-weight: 750;
  line-height: 1.35;
  letter-spacing: 0;
}

.hero-copy h1 span {
  display: block;
}

.hero-copy p:last-child {
  max-width: 540px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.9;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.feature-item {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  align-content: start;
  gap: 9px 10px;
  padding: 18px;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
}

.feature-icon {
  width: 24px;
  height: 24px;
  color: var(--accent-primary-strong);
}

.feature-item h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.feature-item p {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.8;
}

.daily-guide > p:first-child {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 700;
}

.daily-guide ol {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

.daily-guide li {
  position: relative;
  display: grid;
  gap: 5px;
  padding: 0 12px 0 16px;
  border-left: 2px solid rgba(255, 107, 53, 0.3);
}

.daily-guide li + li::before {
  position: absolute;
  left: -22px;
  top: 12px;
  color: var(--text-tertiary);
  content: '→';
}

.daily-guide li span {
  color: var(--text-secondary);
  font-size: 12px;
}

.daily-guide li strong {
  font-size: 12px;
  font-weight: 600;
}

.more-features {
  margin: 18px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.login-card {
  align-self: center;
  display: grid;
  gap: 14px;
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.card-header h2 {
  margin: 6px 0;
  font-family: var(--display-font);
  font-size: 26px;
  line-height: 1.35;
}

.card-header p {
  margin: 0;
  color: var(--text-secondary);
}

.login-form {
  display: grid;
  gap: 14px;
}

.field-block {
  display: grid;
  gap: 8px;
  color: var(--text-secondary);
  font-weight: 700;
}

.field-block input {
  min-height: 44px;
  border-radius: 16px;
}

.password-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.password-field button {
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.75);
  color: var(--text-secondary);
  font-weight: 700;
  padding: 0 14px;
}

.login-error {
  border: 1px solid rgba(255, 61, 0, 0.22);
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(255, 61, 0, 0.08);
  color: #b72f0a;
  font-weight: 700;
}

.login-success {
  border: 1px solid rgba(0, 200, 83, 0.22);
  border-radius: 14px;
  padding: 10px 12px;
  background: rgba(0, 200, 83, 0.1);
  color: #0e8f45;
  font-weight: 700;
}

.login-submit {
  min-height: 46px;
  font-size: 15px;
}

.login-submit:disabled {
  cursor: wait;
  opacity: 0.72;
}

.register-link {
  border: 1px solid rgba(255, 107, 53, 0.16);
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(255, 244, 236, 0.72);
  color: var(--text-secondary);
}

.register-link a {
  color: var(--accent-primary);
  font-weight: 800;
}

.demo-panel {
  display: grid;
  gap: 10px;
  border-top: 1px solid var(--line-soft);
  padding-top: 16px;
}

.demo-title,
.demo-account-name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.demo-accounts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.demo-title small {
  color: var(--text-tertiary);
}

.demo-account {
  display: grid;
  align-content: start;
  gap: 6px;
  min-width: 0;
  width: 100%;
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.62);
  color: var(--text-primary);
  padding: 10px 12px;
  text-align: left;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.demo-account:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 107, 53, 0.28);
  background: rgba(255, 250, 245, 0.95);
}

.demo-account-name strong {
  font-size: 13px;
}

.demo-account-name strong small {
  margin-left: 6px;
}

.demo-account small {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 400;
}

.demo-account em {
  color: var(--accent-primary);
  font-style: normal;
  font-weight: 800;
  font-size: 11px;
}

.login-page :is(button, input, a):focus-visible {
  outline: 2px solid var(--accent-primary-strong);
  outline-offset: 3px;
}

@media (max-width: 980px) {
  .login-page {
    grid-template-columns: minmax(0, 1fr);
    max-width: 680px;
    gap: 32px;
    padding: 32px 24px;
  }

  .login-hero {
    padding: 0;
  }

  .login-card {
    align-self: stretch;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 18px;
  }

  .login-card {
    padding: 20px;
  }

  .hero-copy h1 {
    font-size: clamp(28px, 8vw, 34px);
  }

  .desktop-break {
    display: none;
  }

  .feature-grid {
    gap: 10px;
  }

  .feature-item {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    padding: 14px;
  }

  .feature-item h2 {
    font-size: 14px;
  }

  .daily-guide li {
    padding: 0 6px 0 8px;
  }

  .daily-guide li + li::before {
    content: none;
  }

  .demo-account-name {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rise-in {
    animation: none;
  }

  .login-page button {
    transition: none;
    transform: none;
  }
}
</style>
