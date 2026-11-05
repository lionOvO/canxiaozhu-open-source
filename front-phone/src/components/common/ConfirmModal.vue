<script setup lang="ts">
defineProps<{
  title: string
  message: string
  confirmText?: string
  cancelText?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div class="modal-mask" @click="emit('cancel')">
      <div class="confirm-modal" @click.stop>
        <h3 class="confirm-modal__title">{{ title }}</h3>
        <p class="confirm-modal__message">{{ message }}</p>
        <div class="confirm-modal__actions">
          <button class="btn btn-outline" @click="emit('cancel')">{{ cancelText || '取消' }}</button>
          <button class="btn btn-primary" @click="emit('confirm')">{{ confirmText || '确认' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-modal {
  width: calc(100% - 48px);
  max-width: 320px;
  background: #fff;
  border-radius: var(--radius-lg);
  padding: var(--gap-xl);
  text-align: center;
}

.confirm-modal__title {
  font-size: var(--fs-md);
  font-weight: 600;
  margin-bottom: var(--gap-sm);
}

.confirm-modal__message {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  margin-bottom: var(--gap-lg);
  line-height: 1.5;
}

.confirm-modal__actions {
  display: flex;
  gap: var(--gap-md);
}

.confirm-modal__actions .btn {
  flex: 1;
}
</style>
