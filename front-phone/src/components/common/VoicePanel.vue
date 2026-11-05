<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import MascotAvatar from './MascotAvatar.vue'

const appStore = useAppStore()
const answer = ref('')

watch(() => appStore.recording, (val) => {
  if (val) {
    answer.value = '正在聆听...'
  }
})

watch(() => appStore.voicePanelVisible, (visible) => {
  if (visible && !appStore.recording) {
    answer.value = '老板，我可以帮您查日报、看客户、确认采购单。试试问“这周怎么样”。'
  }
})

function close() {
  appStore.closeVoicePanel()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="appStore.voicePanelVisible" class="modal-mask" @click="close">
        <div class="voice-panel" @click.stop>
          <div class="voice-panel__header">
            <span class="voice-panel__title">AI 语音助手</span>
            <button class="voice-panel__close" @click="close">×</button>
          </div>
          <div class="voice-panel__body">
            <MascotAvatar :size="64" animate />
            <p class="voice-panel__text">{{ answer }}</p>
          </div>
          <div class="voice-panel__hint">
            <span>按住下方麦克风说话</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  align-items: flex-end;
  padding: 0;
}

.voice-panel {
  width: 100%;
  max-width: var(--app-max-width);
  background: #fff;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: var(--gap-lg);
  padding-bottom: calc(var(--gap-xl) + var(--safe-bottom));
}

.voice-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--gap-lg);
}

.voice-panel__title {
  font-size: var(--fs-md);
  font-weight: 600;
}

.voice-panel__close {
  width: 32px;
  height: 32px;
  font-size: var(--fs-xl);
  color: var(--c-text-secondary);
}

.voice-panel__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-md);
  padding: var(--gap-lg) 0;
}

.voice-panel__text {
  font-size: var(--fs-base);
  color: var(--c-text);
  text-align: center;
  line-height: 1.6;
}

.voice-panel__hint {
  text-align: center;
  color: var(--c-text-tertiary);
  font-size: var(--fs-sm);
  margin-top: var(--gap-md);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
