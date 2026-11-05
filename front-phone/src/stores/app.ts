import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { homeData } from '@/data/mock'

export const useAppStore = defineStore('app', () => {
  const storeName = ref(homeData.store)
  const messageCount = ref(homeData.messageCount)
  const voicePanelVisible = ref(false)
  const recording = ref(false)

  const hasUnread = computed(() => messageCount.value > 0)

  function openVoicePanel() {
    voicePanelVisible.value = true
  }

  function closeVoicePanel() {
    voicePanelVisible.value = false
    recording.value = false
  }

  function startRecording() {
    recording.value = true
  }

  function stopRecording() {
    recording.value = false
  }

  return {
    storeName,
    messageCount,
    voicePanelVisible,
    recording,
    hasUnread,
    openVoicePanel,
    closeVoicePanel,
    startRecording,
    stopRecording,
  }
})
