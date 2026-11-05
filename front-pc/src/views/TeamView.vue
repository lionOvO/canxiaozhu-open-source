<script setup lang="ts">
import { createStore, fetchTeam, membershipAction, type StaffRole, type TeamData } from '@/api/membership'
import { useAuthStore } from '@/stores/auth'
import { useMerchantStore } from '@/stores/merchant'
import { ref, watch } from 'vue'

const auth = useAuthStore()
const store = useMerchantStore()
const team = ref<TeamData | null>(null)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const role = ref<StaffRole>('店长')
const invitation = ref<{ code: string; role: string; expiresAt: string } | null>(null)
const showCreate = ref(false)
const showAllInvites = ref(false)
const name = ref('')
const city = ref('上海')
const hours = ref('09:00 - 21:00')
const descriptions = [
  ['老板', '全部经营功能、导出、门店管理、员工邀请与授权。'],
  ['店长', '负责获授权门店的经营、日报、采购、库存、点餐、客户和评价；可对比自己管理的门店。'],
  ['后厨', '查看订单，接单、制作、上桌，以及库存盘点与到货登记。'],
  ['收银', '查看订单，完成收银结单，以及客户跟进。'],
]
const actionLabels: Record<string, string> = { 'create-shop': '新增门店', invite: '创建邀请', 'accept-invitation': '加入门店', 'revoke-invitation': '撤销邀请', 'remove-member': '移除成员', 'change-role': '调整角色' }
function date(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }
function link(code: string) { return `${location.origin}/join?code=${encodeURIComponent(code)}` }
async function reload() {
  const shopId = store.selectedShopId
  if (!shopId || !store.permissions.includes('members:manage')) return
  error.value = ''
  try { const result = await fetchTeam(shopId); if (shopId === store.selectedShopId) team.value = result }
  catch (e) { if (shopId === store.selectedShopId) error.value = e instanceof Error ? e.message : '成员加载失败' }
}
watch(() => store.selectedShopId, () => { team.value = null; invitation.value = null; notice.value = ''; void reload() }, { immediate: true })
async function run(task: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await task(); await reload() } catch (e) { error.value = e instanceof Error ? e.message : '操作失败，请重试' }
  finally { busy.value = false }
}
function invite() { void run(async () => {
  const shopId = store.selectedShopId
  const result = await membershipAction<{ code: string; role: string; expiresAt: string }>('invite', { shop_id: shopId, role: role.value })
  if (shopId !== store.selectedShopId) return
  invitation.value = result
  notice.value = '邀请已生成，请将链接发送给这位员工。'
}) }
async function copy() {
  if (!invitation.value) return
  try { await navigator.clipboard.writeText(link(invitation.value.code)); notice.value = '邀请链接已复制。' }
  catch { notice.value = '复制失败，请选中下面的链接手动复制。' }
}
function changeRole(userId: string, event: Event) {
  const nextRole = (event.target as HTMLSelectElement).value
  void run(async () => { await membershipAction('role', { shop_id: store.selectedShopId, user_id: userId, role: nextRole }); notice.value = '岗位已更新，下次接口请求立即按新权限处理。' })
}
function remove(userId: string, displayName: string) {
  if (!window.confirm(`移除 ${displayName} 在当前门店的权限？该账号在其他门店的身份不受影响。`)) return
  void run(async () => { await membershipAction('remove', { shop_id: store.selectedShopId, user_id: userId }); notice.value = '成员已移除。' })
}
function revoke(id: string) { void run(async () => {
  await membershipAction('revoke', { shop_id: store.selectedShopId, id }); invitation.value = null; notice.value = '邀请已撤销。'
}) }
function addStore() { void run(async () => {
  const result = await createStore(name.value.trim(), city.value.trim(), hours.value.trim())
  await auth.refreshUser(); store.$reset(); await store.bootstrap(); await store.setSelectedShop(result.id)
  showCreate.value = false; name.value = ''; notice.value = '门店已创建，可开始录入资料、邀请员工。'
}) }
</script>

<template>
  <main class="page team-page">
    <header class="panel panel-strong team-hero" aria-labelledby="team-title">
        <div class="section-copy">
          <p class="eyebrow">Store &amp; Team</p>
          <h1 id="team-title">门店与成员</h1>
          <p>在这里新增门店、邀请员工和管理岗位权限。每家门店分别授权，员工只访问自己加入的门店。</p>
        </div>
        <div v-if="auth.user?.canCreateShop" class="store-actions">
          <span>{{ store.currentShop?.name }}</span>
        <button
          class="button-primary create-toggle"
          type="button"
          :aria-expanded="showCreate"
          aria-controls="create-store-form"
          @click="showCreate = !showCreate"
        >
          <span aria-hidden="true">＋</span> {{ showCreate ? '收起新建' : '新增门店' }}
        </button>
        </div>
    </header>

    <section v-if="showCreate" class="panel panel-strong team-card">
      <div class="section-copy section-heading"><p class="eyebrow">New Store</p><h2>新增门店</h2></div>
      <form id="create-store-form" class="create-form" @submit.prevent="addStore">
        <label>门店名称<input v-model="name" required minlength="2" maxlength="30" placeholder="例如：禾盛小馆（滨江店）" /></label>
        <label>城市<input v-model="city" required maxlength="40" /></label>
        <label>营业时间<input v-model="hours" required maxlength="60" /></label>
        <button class="button-primary" :disabled="busy">创建空白门店</button>
      </form>
    </section>

      <div v-if="error" class="feedback feedback-error" role="alert">{{ error }}</div>
      <div v-if="notice" class="feedback feedback-success" role="status">{{ notice }}</div>

    <section class="panel panel-strong team-card invite-workbench" aria-labelledby="invite-title">
        <div class="invite-copy">
          <div class="section-copy"><p class="eyebrow">Invite Members</p><h2 id="invite-title">邀请员工加入门店</h2><p class="section-description">选择员工岗位，生成当前门店的专属邀请链接。</p></div>
        </div>
        <div class="invite-form">
          <label class="role-field"><span>员工岗位</span><select v-model="role" :disabled="busy"><option>店长</option><option>后厨</option><option>收银</option></select></label>
          <button class="button-primary" type="button" :disabled="busy" @click="invite">生成邀请链接</button>
        </div>
        <p class="invite-hint"><span class="hint-dot" aria-hidden="true" />7 天有效 · 一人一次 · 可随时撤销</p>

      <div v-if="invitation" class="invitation-result">
        <div class="result-heading"><span class="pill pill-success">邀请已生成</span><strong>邀请一位{{ invitation.role }}加入 {{ store.currentShop?.name }}</strong></div>
        <p>有效期至 {{ date(invitation.expiresAt) }}。完整链接只在本次生成后显示，请妥善转发。</p>
        <div class="copy-row"><input :value="link(invitation.code)" readonly aria-label="邀请链接" @focus="($event.target as HTMLInputElement).select()" /><button class="button-secondary" type="button" @click="copy">复制链接</button></div>
        <details class="invitation-code"><summary>也可以复制邀请码</summary><code>{{ invitation.code }}</code></details>
      </div>
    </section>

    <div class="team-workspace">
      <div class="team-main">
        <section class="panel panel-strong team-card members-panel" aria-labelledby="members-title">
          <div class="team-head section-heading">
            <div class="section-copy"><p class="eyebrow">Members</p><h2 id="members-title">当前门店成员 <span class="count-badge">{{ team?.members.length ?? '—' }}</span></h2></div>
            <button class="button-ghost refresh-button" type="button" :disabled="busy" @click="reload">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M16 7a6.2 6.2 0 1 0 .2 5M16 3v4h-4" stroke-linecap="round" stroke-linejoin="round" /></svg>刷新
            </button>
          </div>
          <div v-if="team" class="member-list">
            <div class="member-columns" aria-hidden="true"><span>成员 / 账号</span><span>门店岗位</span><span>操作</span></div>
            <article v-for="member in team.members" :key="member.userId" class="member-row">
              <div class="member-identity">
                <span class="member-avatar" :class="{ 'is-owner': member.role === '老板' }" aria-hidden="true">{{ member.user.displayName.slice(0, 1) }}</span>
                <div class="member-info"><div class="member-name"><strong>{{ member.user.displayName }}</strong><span v-if="member.userId === auth.user?.id" class="self-badge">我</span></div><p>{{ member.user.account }}<span aria-hidden="true"> · </span>{{ member.user.phoneMask ?? '未绑定手机' }}</p></div>
              </div>
              <div class="member-role"><span v-if="member.role === '老板'" class="pill owner-badge">老板</span><select v-else :value="member.role" :disabled="busy" :aria-label="`${member.user.displayName}的岗位`" @change="changeRole(member.userId, $event)"><option>店长</option><option>后厨</option><option>收银</option></select></div>
              <span v-if="member.role === '老板'" class="protected-label">受保护</span><button v-else class="remove-button" type="button" :disabled="busy" @click="remove(member.userId, member.user.displayName)">移除</button>
            </article>
          </div>
          <div v-else class="empty-state">正在加载门店成员…</div>
          <p class="panel-footnote">调整岗位后，新权限立即生效；移除成员仅影响当前门店。</p>
        </section>

        <section class="panel panel-strong team-card invitations-panel" aria-labelledby="invitations-title">
          <div class="team-head section-heading"><div class="section-copy"><p class="eyebrow">Invitations</p><h2 id="invitations-title">邀请记录</h2></div><span class="section-meta">{{ team?.invitations.length ?? 0 }} 条记录</span></div>
          <div v-if="!team?.invitations.length" class="empty-state"><strong>还没有发出邀请</strong><p>在上方选择员工岗位，生成第一份邀请链接。</p></div>
          <div v-for="item in team?.invitations.slice(0, showAllInvites ? undefined : 5)" :key="item.id" class="record-row">
            <div class="record-copy"><strong>{{ item.role }}邀请</strong><p>{{ date(item.createdAt) }} 创建</p><p>{{ date(item.expiresAt) }} 到期</p></div>
            <span class="pill" :class="item.status === '待接受' ? 'pill-warning' : item.status === '已使用' ? 'pill-success' : 'pill-neutral'">{{ item.status }}</span>
            <button v-if="item.status === '待接受'" class="remove-button" type="button" :disabled="busy" @click="revoke(item.id)">撤销</button><span v-else class="record-action-placeholder" aria-hidden="true" />
          </div>
          <button v-if="(team?.invitations.length ?? 0) > 5" class="text-button show-records" type="button" :aria-expanded="showAllInvites" @click="showAllInvites = !showAllInvites">{{ showAllInvites ? '收起记录' : '查看全部邀请记录' }} <span aria-hidden="true">{{ showAllInvites ? '↑' : '↓' }}</span></button>
        </section>

        <section class="panel panel-strong team-card audit-panel">
          <details><summary class="audit-title"><span>最近权限操作</span><span class="audit-hint">查看操作记录 <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m5 3 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" /></svg></span></summary><p v-if="!team?.logs.length" class="empty-state">暂无操作记录。</p><div v-for="log in team?.logs" :key="log.id" class="record-row audit-row"><div class="record-copy"><strong>{{ actionLabels[log.action] ?? log.action }}</strong><p>{{ log.actorName }} · {{ log.targetLabel }}</p></div><time>{{ date(log.createdAt) }}</time></div></details>
        </section>
      </div>

      <aside class="panel panel-strong team-card roles-panel" aria-labelledby="roles-title">
        <div class="section-copy section-heading"><p class="eyebrow">Role Guide</p><h2 id="roles-title">岗位可以做什么</h2><p class="section-description">按门店岗位分工，权限边界一目了然。</p></div>
        <div class="role-grid"><article v-for="item in descriptions" :key="item[0]" class="role-card"><div class="role-heading"><span class="role-mark" :class="{ 'is-owner': item[0] === '老板' }" aria-hidden="true">{{ item[0]?.slice(0, 1) }}</span><h3>{{ item[0] }}</h3><span v-if="item[0] === '老板'" class="role-caption">门店管理</span></div><p>{{ item[1] }}</p></article></div>
        <div class="permission-note"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M10 2.5 16.5 5v5.5c0 3.4-6.5 7-6.5 7s-6.5-3.6-6.5-7V5L10 2.5Z" stroke-linejoin="round" /><path d="m7 9.5 2 2 4-4" stroke-linecap="round" stroke-linejoin="round" /></svg><p>导出、系统配置和员工授权由老板管理。老板身份不支持通过员工邀请授予或降级。</p></div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.team-page, .team-main { display: grid; gap: 20px; }
.team-hero { display: flex; align-items: end; justify-content: space-between; gap: 28px; padding: 27px 30px; color: #fff8ef; border-color: rgba(143, 68, 54, .2); background: linear-gradient(112deg, #8f4436, #a4543d 62%, #9f5e42); }
.team-hero h1, .team-hero p { margin: 0; }
.team-hero h1 { margin: 6px 0 8px; font-family: var(--display-font); font-size: clamp(30px, 3vw, 42px); }
.team-hero .eyebrow { color: #fff0df; }
.team-hero .section-copy > p:last-child { max-width: 760px; color: #fff0df; line-height: 1.65; }
.team-hero .create-toggle { color: #873e2e; border-color: rgba(255, 248, 239, .6); background: #fff0df; box-shadow: 0 8px 20px rgba(93, 39, 28, .14); }
.team-hero .create-toggle:hover { background: #fff8ef; }
.team-page .team-hero button:focus-visible { outline-color: #fff0df; }
.team-card { min-width: 0; padding: 21px; }
.store-actions { display: grid; justify-items: end; gap: 10px; flex: 0 0 auto; }
.store-actions > span { color: #fff0df; font-size: 12px; }
.team-head { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.section-copy { min-width: 0; }
.team-card .section-copy h2, .team-card .section-copy p { margin: 0; }
.team-card .section-copy .eyebrow { margin-bottom: 3px; }
.section-copy h2 { display: flex; align-items: center; gap: 10px; font-size: 21px; line-height: 1.5; }
.section-copy .section-description { margin-top: 8px; color: var(--text-secondary); font-size: 14px; line-height: 1.7; }
.create-toggle { flex-shrink: 0; }
.team-page :is(.button-primary, .button-secondary, .button-ghost) { min-height: 40px; white-space: nowrap; }
.team-page :is(input, select) { min-width: 0; min-height: 42px; font-size: 14px; }
.team-page :is(button, input, select, summary):focus-visible { outline: 3px solid rgba(255, 107, 53, .35); outline-offset: 3px; }
.team-page button:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.create-form { display: grid; grid-template-columns: minmax(180px, 1.5fr) minmax(100px, .7fr) minmax(140px, 1fr) auto; align-items: end; gap: 14px; }
.create-form label, .role-field { display: grid; gap: 8px; color: var(--text-secondary); font-size: 13px; font-weight: 700; }
.create-form button { min-height: 42px; }
.feedback { padding: 12px 16px; border: 1px solid var(--line-soft); border-radius: var(--radius-sm); font-size: 13px; line-height: 1.7; }
.feedback-error { background: rgba(255, 61, 0, .06); border-color: rgba(255, 61, 0, .16); color: #b44226; }
.feedback-success { background: rgba(0, 200, 83, .06); border-color: rgba(0, 200, 83, .14); color: #28764e; }
.invite-workbench { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 15px 24px; border-color: rgba(201, 91, 49, .16); background: linear-gradient(115deg, #ffe9d8, #fff4e9 68%, #fff8ef); }
.invite-form { display: flex; align-items: end; gap: 14px; }
.invite-copy .section-description { margin-top: 5px; font-size: 12px; }
.role-field { width: 112px; }
.role-field span { font-size: 12px; }
.invite-form button { min-height: 42px; }
.invite-hint { grid-column: 1 / -1; display: flex; align-items: center; gap: 7px; margin: 0; padding: 10px 13px; border-radius: 10px; background: rgba(255, 255, 255, .58); font-size: 12px; color: var(--text-secondary); }
.hint-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent-primary); opacity: .6; }
.invitation-result { grid-column: 1 / -1; padding: 18px; border: 1px solid var(--line-soft); border-radius: var(--radius-md); background: var(--bg-panel-strong); }
.result-heading, .copy-row { display: flex; align-items: center; gap: 12px; }
.result-heading { flex-wrap: wrap; }
.result-heading strong { font-size: 14px; }
.invitation-result > p { margin: 12px 0; font-size: 13px; color: var(--text-secondary); line-height: 1.8; }
.copy-row input { flex: 1; width: 0; }
.invitation-code { margin-top: 14px; color: var(--text-secondary); font-size: 12px; }
.invitation-code summary { cursor: pointer; }
.invitation-code code { display: block; padding-top: 10px; overflow-wrap: anywhere; }
.team-workspace { display: grid; grid-template-columns: minmax(0, 1fr) 320px; align-items: start; gap: 17px; }
.team-main { min-width: 0; }
.section-heading { margin-bottom: 15px; }
.count-badge { display: inline-grid; place-items: center; min-width: 28px; height: 26px; padding: 0 8px; border-radius: 8px; background: var(--bg-accent); color: var(--accent-primary-strong); font-family: var(--display-font); font-size: 15px; font-weight: 700; }
.refresh-button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; font-size: 12px; }
.refresh-button svg { width: 16px; height: 16px; }
.member-columns, .member-row { display: grid; grid-template-columns: minmax(0, 1fr) 104px 48px; align-items: center; gap: 16px; }
.member-columns { padding: 10px 12px; color: var(--text-secondary); font-size: 11px; border: 1px solid var(--line-soft); border-radius: var(--radius-sm); background: #fbf5ed; }
.member-columns span:last-child { text-align: center; }
.member-row { min-height: 76px; padding: 14px 12px; border-bottom: 1px solid var(--line-soft); }
.member-row:last-child { border-bottom: 0; }
.member-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
.member-avatar { display: grid; place-items: center; width: 40px; height: 40px; flex: 0 0 40px; border: 1px solid var(--line-soft); border-radius: 12px; color: var(--text-secondary); background: var(--bg-muted); font-size: 16px; font-weight: 700; }
.member-avatar.is-owner { border-color: rgba(255, 107, 53, .16); background: var(--bg-accent); color: var(--accent-primary-strong); }
.member-info { min-width: 0; }
.member-name { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.member-name strong { font-size: 15px; overflow-wrap: anywhere; }
.self-badge { color: var(--text-tertiary); font-size: 11px; }
.member-info p { margin: 5px 0 0; color: var(--text-tertiary); font-size: 12px; overflow-wrap: anywhere; }
.member-role { display: flex; align-items: center; min-width: 0; }
.member-role select { width: 104px; padding: 9px 11px; }
.owner-badge { justify-content: center; min-width: 70px; background: var(--bg-accent); color: var(--accent-primary-strong); }
.protected-label { text-align: center; color: var(--text-tertiary); font-size: 11px; }
.remove-button { min-height: 34px; padding: 6px 9px; border: 1px solid var(--line-soft); border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); font-size: 12px; white-space: nowrap; transition: color 160ms ease, border-color 160ms ease, background 160ms ease; }
.remove-button:hover { color: var(--accent-danger); border-color: rgba(255, 61, 0, .18); background: rgba(255, 61, 0, .04); }
.panel-footnote { margin: 4px 0 0; padding-top: 14px; border-top: 1px solid var(--line-soft); color: var(--text-tertiary); font-size: 12px; line-height: 1.8; }
.section-meta { color: var(--text-tertiary); font-size: 12px; white-space: nowrap; }
.empty-state { display: grid; gap: 6px; padding: 24px 18px; border: 1px dashed var(--line-strong); border-radius: var(--radius-md); background: rgba(247, 243, 237, .45); color: var(--text-secondary); font-size: 13px; line-height: 1.8; }
.empty-state p { margin: 0; color: var(--text-tertiary); }
.record-row { display: flex; align-items: center; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--line-soft); }
.record-row:last-of-type { border-bottom: 0; }
.record-copy { min-width: 0; flex: 1; }
.record-copy strong { font-size: 14px; }
.record-copy p { margin: 4px 0 0; font-size: 12px; color: var(--text-tertiary); line-height: 1.7; overflow-wrap: anywhere; }
.record-row .pill { flex-shrink: 0; padding: 5px 9px; font-size: 11px; }
.record-action-placeholder { width: 43px; flex-shrink: 0; }
.text-button { padding: 0; border: 0; background: none; color: var(--accent-primary-strong); font-size: 13px; cursor: pointer; }
.show-records { display: flex; align-items: center; gap: 8px; margin: 16px auto 0; }
.roles-panel { background: linear-gradient(160deg, #f7e9dc, #fff7ee 72%); }
.roles-panel .section-description { font-size: 13px; }
.role-grid { display: grid; }
.role-card { padding: 18px 0; border-bottom: 1px solid var(--line-soft); }
.role-card:first-child { padding-top: 0; }
.role-card:last-child { border-bottom: 0; }
.role-heading { display: flex; align-items: center; gap: 10px; }
.role-heading h3 { margin: 0; font-size: 15px; }
.role-mark { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--line-soft); border-radius: 8px; color: var(--text-secondary); background: rgba(255, 255, 255, .7); font-size: 12px; font-weight: 700; }
.role-mark.is-owner { border-color: rgba(255, 107, 53, .15); color: var(--accent-primary-strong); background: var(--bg-accent); }
.role-caption { margin-left: auto; font-size: 11px; color: var(--text-tertiary); }
.role-card p { margin: 10px 0 0; color: var(--text-secondary); font-size: 13px; line-height: 1.85; }
.permission-note { display: flex; align-items: start; gap: 9px; margin-top: 8px; padding: 14px; border: 1px solid var(--line-soft); border-radius: var(--radius-sm); background: rgba(255, 255, 255, .64); }
.permission-note svg { flex: 0 0 18px; width: 18px; height: 18px; margin-top: 2px; color: var(--text-secondary); }
.permission-note p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.8; }
.audit-title { display: flex; align-items: center; justify-content: space-between; gap: 16px; list-style: none; cursor: pointer; }
.audit-title::-webkit-details-marker { display: none; }
.audit-title > span:first-child { font-size: 16px; font-weight: 700; }
.audit-hint { display: flex; align-items: center; gap: 6px; color: var(--text-tertiary); font-size: 12px; }
.audit-hint svg { width: 12px; height: 12px; transition: transform 160ms ease; }
.audit-panel details[open] .audit-hint svg { transform: rotate(90deg); }
.audit-panel details[open] .audit-title { margin-bottom: 16px; }
.audit-row time { flex-shrink: 0; font-family: var(--display-font); color: var(--text-tertiary); font-size: 12px; }
@media (max-width: 1280px) {
  .team-workspace { grid-template-columns: minmax(0, 1fr); }
  .role-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
  .role-card { padding: 0; border: 0; }
  .roles-panel .section-heading { margin-bottom: 22px; }
  .permission-note { margin-top: 22px; }
}
@media (max-width: 960px) {
  .invite-workbench { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .invite-form { justify-content: start; }
  .create-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 860px) {
  .team-hero { align-items: start; flex-direction: column; }
  .store-actions { justify-items: start; }
}
@media (max-width: 620px) {
  .team-hero { padding: 19px; }
}
@media (max-width: 600px) {
  .team-card { padding: 19px; }
  .section-copy h2 { font-size: 20px; }
  .section-copy .section-description { font-size: 13px; }
  .invite-form { padding-left: 0; gap: 10px; }
  .role-field { width: 90px; flex: 0 0 90px; }
  .invite-form .button-primary { flex: 1; padding: 10px 12px; font-size: 12px; }
  .invite-hint { margin-left: 0; font-size: 11px; }
  .create-form, .role-grid { grid-template-columns: minmax(0, 1fr); }
  .create-form button { justify-self: start; }
  .result-heading { gap: 10px; }
  .invitation-result { padding: 16px; }
  .copy-row { align-items: stretch; flex-direction: column; }
  .copy-row input { flex: auto; width: 100%; }
  .copy-row button { align-self: start; }
  .member-columns { display: none; }
  .member-row { grid-template-columns: minmax(0, 1fr) auto; gap: 12px; padding: 18px 0; }
  .member-identity { grid-column: 1 / -1; }
  .member-role { padding-left: 52px; }
  .member-role select { width: 108px; }
  .protected-label, .member-row .remove-button { justify-self: end; }
  .member-row .protected-label { padding: 6px 9px; }
  .role-card + .role-card { padding-top: 18px; border-top: 1px solid var(--line-soft); }
  .record-row { gap: 8px; }
  .record-action-placeholder { width: 43px; }
  .record-row .pill { padding: 4px 7px; }
  .section-meta { font-size: 11px; }
  .audit-title { align-items: start; flex-direction: column; gap: 6px; }
  .audit-row { align-items: start; flex-direction: column; }
}
</style>
