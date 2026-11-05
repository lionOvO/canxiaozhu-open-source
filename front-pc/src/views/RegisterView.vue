<script setup lang="ts">
import { sendRegisterSms } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const inviteCode = computed(() => typeof route.query.invite === 'string' ? route.query.invite : '')
const authStore = useAuthStore()

const form = reactive({
  account: '',
  displayName: '',
  phone: '',
  smsCode: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const errorMessage = ref('')
const successMessage = ref('')
const sendingSms = ref(false)
const countdown = ref(0)
const passwordVisible = ref(false)
let countdownTimer: number | undefined

const passwordInputType = computed(() => (passwordVisible.value ? 'text' : 'password'))
const canSendSms = computed(() => /^1[3-9]\d{9}$/.test(form.phone.trim()) && countdown.value === 0)
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function startCountdown(seconds: number) {
  countdown.value = seconds
  if (countdownTimer) {
    window.clearInterval(countdownTimer)
  }

  countdownTimer = window.setInterval(() => {
    countdown.value = Math.max(0, countdown.value - 1)
    if (countdown.value === 0 && countdownTimer) {
      window.clearInterval(countdownTimer)
      countdownTimer = undefined
    }
  }, 1000)
}

async function handleSendSms() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!canSendSms.value) {
    errorMessage.value = '请输入有效手机号后再获取验证码。'
    return
  }

  sendingSms.value = true
  try {
    const result = await sendRegisterSms(form.phone.trim())
    successMessage.value = result.message
    startCountdown(Math.min(result.expiresIn, 60))
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '验证码发送失败，请稍后重试。'
  } finally {
    sendingSms.value = false
  }
}

function validateForm(): boolean {
  if (!form.account.trim() || !form.phone.trim()) {
    errorMessage.value = '请填写用户名和手机号。'
    return false
  }

  if (form.email.trim() && !emailPattern.test(form.email.trim())) {
    errorMessage.value = '电子邮箱格式不正确；如果暂时不用邮箱，可以留空。'
    return false
  }

  if (!form.smsCode.trim()) {
    errorMessage.value = '请输入短信验证码。'
    return false
  }

  if (form.password.length < 8) {
    errorMessage.value = '密码至少需要 8 位，并包含字母和数字。'
    return false
  }

  if (form.password !== form.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致。'
    return false
  }

  return true
}

async function submitRegister() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!validateForm()) {
    return
  }

  try {
    await authStore.register({
      inviteCode: inviteCode.value || undefined,
      account: form.account.trim(),
      displayName: form.displayName.trim() || undefined,
      phone: form.phone.trim(),
      smsCode: form.smsCode.trim(),
      email: form.email.trim() || undefined,
      password: form.password,
      confirmPassword: form.confirmPassword,
    })
    await router.replace({
      path: '/login',
      query: {
        registered: '1',
        account: form.account.trim(),
      },
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '注册失败，请稍后重试。'
  }
}

onBeforeUnmount(() => {
  if (countdownTimer) {
    window.clearInterval(countdownTimer)
  }
})
</script>

<template>
  <main class="register-page">
    <section class="register-hero rise-in">
      <div class="steam-badge">
        <span>餐</span>
      </div>
      <p class="eyebrow">Merchant Onboarding</p>
      <h1>{{ inviteCode ? '创建员工账号，加入受邀门店。' : '开一家自己的门店，从这里开始。' }}</h1>
      <p>
        {{ inviteCode ? '注册后按邀请中的岗位加入门店，权限由门店老板管理。' : '注册后成为自己门店的老板，可新增门店，并邀请店长、后厨和收银。' }}
      </p>

      <div class="onboard-strip panel panel-strong">
        <span>短信校验</span>
        <span>加密入库</span>
        <span>手动登录</span>
      </div>
    </section>

    <section class="register-card panel panel-strong rise-in stagger-2" aria-labelledby="register-title">
      <div class="card-header">
        <div>
          <p class="eyebrow">Create Account</p>
          <h2 id="register-title">{{ inviteCode ? '接受邀请并注册' : '创建商户账号' }}</h2>
          <p>注册成功后返回登录页，确认账号密码后再进入经营驾驶舱。</p>
        </div>
        <RouterLink class="back-login" to="/login">返回登录</RouterLink>
      </div>

      <form class="register-form" @submit.prevent="submitRegister">
        <label class="field-block">
          <span>用户名</span>
          <input v-model="form.account" autocomplete="username" placeholder="例如 老王小店 / wangboss" />
        </label>

        <label class="field-block">
          <span>联系人姓名</span>
          <input v-model="form.displayName" autocomplete="name" placeholder="例如 老王" />
        </label>

        <label class="field-block">
          <span>手机号</span>
          <div class="sms-field">
            <input v-model="form.phone" autocomplete="tel" placeholder="请输入手机号" />
            <button type="button" :disabled="sendingSms || !canSendSms" @click="handleSendSms">
              {{ countdown > 0 ? `${countdown}s` : sendingSms ? '发送中' : '获取验证码' }}
            </button>
          </div>
        </label>

        <label class="field-block">
          <span>短信验证码</span>
          <input v-model="form.smsCode" inputmode="numeric" maxlength="6" placeholder="6 位验证码" />
        </label>

        <label class="field-block">
          <span>电子邮箱 <small>选填，可重复</small></span>
          <input v-model="form.email" autocomplete="email" placeholder="选填，用于账号通知和找回" />
        </label>

        <label class="field-block">
          <span>密码</span>
          <div class="sms-field">
            <input
              v-model="form.password"
              :type="passwordInputType"
              autocomplete="new-password"
              placeholder="至少 8 位，包含字母和数字"
            />
            <button type="button" @click="passwordVisible = !passwordVisible">
              {{ passwordVisible ? '隐藏' : '显示' }}
            </button>
          </div>
        </label>

        <label class="field-block">
          <span>确认密码</span>
          <input
            v-model="form.confirmPassword"
            :type="passwordInputType"
            autocomplete="new-password"
            placeholder="请再次输入密码"
          />
        </label>

        <div v-if="errorMessage" class="form-message form-error" role="alert">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="form-message form-success">
          {{ successMessage }}
        </div>

        <button class="button-primary register-submit" type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? '正在创建账号...' : '创建账号并返回登录' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.register-page {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(460px, 0.78fr);
  gap: 34px;
  min-height: 100vh;
  padding: 44px;
  overflow: hidden;
}

.register-page::before,
.register-page::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.register-page::before {
  inset: 12px auto auto 18px;
  width: 52vw;
  height: 52vw;
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(255, 107, 53, 0.2), transparent 58%),
    radial-gradient(circle at 30% 20%, rgba(255, 202, 122, 0.3), transparent 42%);
  filter: blur(6px);
}

.register-page::after {
  right: 6%;
  bottom: -14%;
  width: 360px;
  height: 360px;
  border-radius: 999px;
  background: rgba(0, 200, 83, 0.1);
}

.register-hero,
.register-card {
  position: relative;
  z-index: 1;
}

.register-hero {
  display: grid;
  align-content: center;
  gap: 22px;
  min-height: calc(100vh - 88px);
}

.steam-badge {
  display: grid;
  place-items: center;
  width: 86px;
  height: 86px;
  border-radius: 28px;
  background: linear-gradient(135deg, var(--accent-primary), #ff9a5c);
  box-shadow: 0 28px 60px rgba(255, 107, 53, 0.28);
  color: #ffffff;
  font-family: var(--display-font);
  font-size: 42px;
  font-weight: 800;
}

.register-hero h1 {
  max-width: 760px;
  margin: 0;
  font-family: var(--display-font);
  font-size: clamp(42px, 5.8vw, 82px);
  line-height: 1;
  letter-spacing: -0.045em;
}

.register-hero > p:not(.eyebrow) {
  max-width: 620px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 17px;
}

.onboard-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-width: 620px;
  padding: 16px;
}

.onboard-strip span {
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(255, 107, 53, 0.1);
  color: var(--accent-primary);
  font-weight: 800;
}

.register-card {
  align-self: center;
  display: grid;
  gap: 22px;
  padding: 28px;
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
  font-size: 34px;
}

.card-header p {
  margin: 0;
  color: var(--text-secondary);
}

.back-login {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(255, 107, 53, 0.1);
  color: var(--accent-primary);
  font-size: 12px;
  font-weight: 800;
}

.register-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field-block {
  display: grid;
  gap: 8px;
  color: var(--text-secondary);
  font-weight: 700;
}

.field-block small {
  margin-left: 6px;
  color: var(--accent-primary);
  font-size: 12px;
  font-weight: 800;
}

.field-block input {
  min-height: 48px;
  border-radius: 16px;
}

.sms-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.sms-field button {
  min-width: 102px;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.75);
  color: var(--accent-primary);
  font-weight: 800;
  padding: 0 14px;
}

.sms-field button:disabled,
.register-submit:disabled {
  cursor: wait;
  opacity: 0.62;
}

.form-message,
.register-submit {
  grid-column: 1 / -1;
}

.form-message {
  border-radius: 14px;
  padding: 10px 12px;
  font-weight: 700;
}

.form-error {
  border: 1px solid rgba(255, 61, 0, 0.22);
  background: rgba(255, 61, 0, 0.08);
  color: #b72f0a;
}

.form-success {
  border: 1px solid rgba(0, 200, 83, 0.22);
  background: rgba(0, 200, 83, 0.1);
  color: #0e8f45;
}

.register-submit {
  min-height: 50px;
  font-size: 15px;
}

@media (max-width: 1080px) {
  .register-page {
    grid-template-columns: minmax(0, 1fr);
    padding: 24px;
  }

  .register-hero {
    min-height: auto;
    padding-top: 24px;
  }

  .register-card {
    align-self: stretch;
  }
}

@media (max-width: 720px) {
  .register-page {
    padding: 18px;
  }

  .register-form,
  .sms-field {
    grid-template-columns: minmax(0, 1fr);
  }

  .card-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
