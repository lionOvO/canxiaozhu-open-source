<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const statusText = ref('正在完成微信扫码登录，请稍等。')
const errorMessage = ref('')

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''

  if (!code || !state) {
    errorMessage.value = '微信回调缺少授权参数，请回到登录页重新扫码。'
    return
  }

  try {
    const result = await authStore.completeWechatLogin(code, state)
    statusText.value = '微信登录成功，正在进入餐小助。'
    await router.replace(result.redirectPath || '/dashboard')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '微信登录失败，请回到登录页重新扫码。'
  }
})
</script>

<template>
  <main class="wechat-callback-page">
    <section class="callback-card panel panel-strong rise-in">
      <div class="wechat-orb">微</div>
      <p class="eyebrow">Wechat Login</p>
      <h1>{{ errorMessage ? '微信登录未完成' : '正在连接餐小助' }}</h1>
      <p>{{ errorMessage || statusText }}</p>
      <RouterLink v-if="errorMessage" class="button-primary" to="/login">返回登录页</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.wechat-callback-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 18% 22%, rgba(7, 193, 96, 0.14), transparent 28%),
    radial-gradient(circle at 78% 76%, rgba(255, 107, 53, 0.14), transparent 30%),
    #fffaf5;
}

.callback-card {
  display: grid;
  justify-items: center;
  gap: 14px;
  width: min(480px, 100%);
  padding: 34px;
  text-align: center;
}

.wechat-orb {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 24px;
  background: #07c160;
  color: #fff;
  font-family: var(--display-font);
  font-size: 30px;
  font-weight: 900;
  box-shadow: 0 24px 46px rgba(7, 193, 96, 0.22);
}

.callback-card h1,
.callback-card p {
  margin: 0;
}

.callback-card h1 {
  font-family: var(--display-font);
  font-size: 36px;
}

.callback-card p {
  color: var(--text-secondary);
  line-height: 1.7;
}
</style>
