<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useMerchantStore } from '@/stores/merchant'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const auth = useAuthStore()
const merchant = useMerchantStore()
const router = useRouter()
const route = useRoute()
const account = ref('')
const password = ref('')
const error = ref(route.query.noShop ? '当前账号没有可访问的门店，请联系老板邀请加入。' : '')
const busy = ref(false)
async function submit() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    await auth.login(account.value.trim(), password.value)
    merchant.$reset()
    if (!auth.user?.assignedShopIds.length) { error.value = '当前账号没有可访问的门店，请联系老板邀请加入。'; return }
    const path = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//') && !route.query.redirect.includes('\\') ? route.query.redirect : '/'
    await router.replace(path)
  } catch (e) { error.value = e instanceof Error ? e.message : '登录失败，请重试' }
  finally { busy.value = false }
}
</script>
<template><main class="mobile-login"><section class="surface-card login-card"><div class="brand-mark">餐</div><h1>登录餐小助</h1><p>按你的岗位，处理今天的门店事务。</p><form @submit.prevent="submit"><label>账号 / 邮箱 / 手机号<input v-model="account" required autocomplete="username" /></label><label>密码<input v-model="password" required type="password" autocomplete="current-password" /></label><p v-if="error" class="error" role="alert">{{ error }}</p><button :disabled="busy">{{ busy ? '正在登录…' : '进入我的门店' }}</button></form><p>员工请先使用老板的邀请链接加入门店，再用自己的账号登录。</p></section></main></template>
<style scoped>.mobile-login { min-height: 100dvh; display: grid; place-items: center; padding: 24px; background: radial-gradient(at 10% 10%, #ffe8d6, transparent 70%); }.login-card { width: min(420px, 100%); padding: 28px; border: 1px solid #eee3d9; background: white; border-radius: 24px; }.brand-mark { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 15px; color: white; background: #ff713e; font-size: 26px; font-weight: 700; }h1 { margin: 24px 0 12px; font-size: 26px; }p { color: #8b7766; line-height: 1.8; font-size: 13px; }form, label { display: grid; gap: 12px; }form { gap: 22px; padding: 20px 0; }label { font-size: 14px; }input { padding: 14px; border: 1px solid #e9dfd5; border-radius: 12px; font: inherit; width: 100%; box-sizing: border-box; }button { border: 0; background: #ff713e; color: white; padding: 15px; font: inherit; font-weight: 700; border-radius: 14px; }button:disabled { opacity: .5; }.error { color: #b63d22; }</style>
