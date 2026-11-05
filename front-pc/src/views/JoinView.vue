<script setup lang="ts">
import { membershipAction, previewInvitation } from '@/api/membership'
import { useAuthStore } from '@/stores/auth'
import { useMerchantStore } from '@/stores/merchant'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
const auth = useAuthStore()
const merchant = useMerchantStore()
const route = useRoute()
const router = useRouter()
const code = ref(typeof route.query.code === 'string' ? route.query.code : '')
const preview = ref<{ shopName: string; role: string; expiresAt: string } | null>(null)
const error = ref('')
const busy = ref(false)
const redirect = computed(() => `/join?code=${encodeURIComponent(code.value.trim())}`)
async function inspect() {
  error.value = ''; preview.value = null
  if (!code.value.trim()) return
  busy.value = true
  try { preview.value = await previewInvitation(code.value.trim()) } catch (e) { error.value = e instanceof Error ? e.message : '邀请信息加载失败' }
  finally { busy.value = false }
}
watch(() => route.query.code, () => { code.value = typeof route.query.code === 'string' ? route.query.code : ''; void inspect() }, { immediate: true })
async function accept() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    const result = await membershipAction<{ shopId: number }>('accept', { code: code.value.trim() })
    await auth.refreshUser(); merchant.$reset(); await merchant.bootstrap(); await merchant.setSelectedShop(result.shopId)
    await router.replace({ name: merchant.permissions.includes('dashboard') ? 'dashboard' : 'dining' })
  } catch (e) { error.value = e instanceof Error ? e.message : '加入失败，请重试' }
  finally { busy.value = false }
}
</script>
<template><main class="join-page"><section class="panel panel-strong join-card"><p class="eyebrow">Join the team</p><h1>加入门店，一起打理。</h1><p>请使用老板提供的邀请链接或邀请码，加入指定门店。</p><form @submit.prevent="inspect"><label for="invite-code">邀请码</label><div class="code-row"><input id="invite-code" v-model="code" required maxlength="80" autocomplete="off" placeholder="粘贴老板发来的邀请码" @input="preview = null" /><button class="button-secondary" :disabled="busy">查看邀请</button></div></form><p v-if="error" class="error" role="alert">{{ error }}</p><div v-if="preview" class="preview"><h2>{{ preview.shopName }}</h2><p>受邀岗位：<strong>{{ preview.role }}</strong></p><p>有效期至 {{ new Date(preview.expiresAt).toLocaleString('zh-CN') }}，仅能使用一次。</p><button v-if="auth.isAuthenticated" class="button-primary" :disabled="busy" @click="accept">以 {{ auth.user?.displayName }} 的账号加入</button><div v-else class="join-actions"><RouterLink class="button-primary" :to="{ name: 'login', query: { redirect } }">已有账号，登录加入</RouterLink><RouterLink class="button-secondary" :to="{ name: 'register', query: { invite: code.trim() } }">新员工，注册加入</RouterLink></div></div><p v-if="auth.isAuthenticated && !auth.user?.assignedShopIds.length">你的账号目前没有可访问的门店，请联系门店老板重新邀请。</p><RouterLink v-if="auth.user?.assignedShopIds.length" to="/">返回我的门店</RouterLink><button v-if="auth.isAuthenticated" class="switch-account" @click="auth.logout()">切换账号</button><RouterLink v-else to="/login">返回登录</RouterLink></section></main></template>
<style scoped>.join-page { min-height: 100vh; display: grid; place-items: center; padding: 28px; background: radial-gradient(at 15% 15%, #ffe8d6, transparent 60%); }.join-card { width: min(600px, 100%); padding: clamp(24px, 5vw, 44px); }h1 { font-size: 28px; margin: 12px 0 18px; }p { color: #8b7766; line-height: 1.9; font-size: 14px; }label { font-size: 13px; display: block; margin: 25px 0 10px; }.code-row { display: flex; gap: 10px; }input { flex: 1; min-width: 0; border: 1px solid #eadbd0; border-radius: 12px; padding: 12px; }.preview { margin: 22px 0; padding: 22px; border-radius: 16px; background: #fff4ea; }.preview h2 { font-size: 20px; }.error { color: #ba3e22; }.join-actions { display: flex; gap: 10px; flex-wrap: wrap; }.switch-account { margin-left: 20px; border: 0; background: none; color: #a27659; cursor: pointer; }@media (max-width: 500px) { .code-row { flex-direction: column; }h1 { font-size: 24px; } }</style>
