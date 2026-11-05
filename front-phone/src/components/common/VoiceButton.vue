<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

let pressTimer: ReturnType<typeof setTimeout> | null = null

function onPointerDown() {
  appStore.startRecording()
  pressTimer = setTimeout(() => {
    // 长按持续中
  }, 800)
}

function onPointerUp() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
  if (appStore.recording) {
    appStore.stopRecording()
  }
  appStore.openVoicePanel()
}
</script>

<template>
  <button class="voice-button" @pointerdown="onPointerDown" @pointerup="onPointerUp" @pointerleave="onPointerUp">
    <div class="voice-ring" :class="{ recording: appStore.recording }">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </div>
  </button>
</template>

<style scoped>
.voice-button {
  position: fixed;
  right: 20px;
  bottom: calc(60px + var(--safe-bottom));
  z-index: 90;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
  animation: breathe 2.5s ease-in-out infinite;
}

.voice-ring {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.voice-ring.recording {
  transform: scale(1.15);
  background: rgba(255, 255, 255, 0.15);
}

@keyframes breathe {
  0%, 100% {
    box-shadow: 0 6px 20px rgba(255, 107, 53, 0.35);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 8px 28px rgba(255, 107, 53, 0.55);
    transform: scale(1.05);
  }
}
</style>
