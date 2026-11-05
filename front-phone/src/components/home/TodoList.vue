<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { TodoItem } from '@/types/home'

const props = defineProps<{
  items: TodoItem[]
}>()

const router = useRouter()

function handle(item: TodoItem) {
  router.push(item.route)
}
</script>

<template>
  <div class="todo-list card">
    <h3 class="section-title">今日待办</h3>
    <ul>
      <li v-for="item in props.items" :key="item.id" class="todo-item">
        <div class="todo-content">
          <span class="todo-category">【{{ item.category }}】</span>
          <span class="todo-text">{{ item.content }}</span>
          <span v-if="item.confidence" class="todo-confidence">（置信度{{ item.confidence }}%）</span>
        </div>
        <button class="todo-action" @click="handle(item)">去处理</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.todo-list {
  margin: var(--gap-md) var(--gap-md) 0;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap-md);
  padding: var(--gap-md) 0;
  border-bottom: 1px solid var(--c-divider);
}

.todo-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.todo-content {
  flex: 1;
  font-size: var(--fs-sm);
  line-height: 1.5;
  color: var(--c-text);
}

.todo-category {
  color: var(--c-primary);
  font-weight: 500;
}

.todo-confidence {
  color: var(--c-text-tertiary);
}

.todo-action {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  background: var(--c-primary-light);
  color: var(--c-primary);
  font-size: var(--fs-xs);
  font-weight: 500;
  white-space: nowrap;
}
</style>
