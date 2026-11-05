<script setup lang="ts">
import { ref } from 'vue'
import TagPill from '@/components/common/TagPill.vue'
import type { CustomerTag } from '@/types/customer'

const props = defineProps<{
  tags: CustomerTag[]
}>()

const selectedTag = ref<CustomerTag | null>(null)

function select(tag: CustomerTag) {
  selectedTag.value = tag
}
</script>

<template>
  <div class="tag-cloud card">
    <h3 class="section-title">客户偏好</h3>
    <div class="tag-list">
      <TagPill
        v-for="tag in props.tags"
        :key="tag.id"
        :category="tag.category"
        clickable
        @click="select(tag)"
      >
        {{ tag.name }}
      </TagPill>
    </div>

    <div v-if="selectedTag" class="tag-definition">
      <strong>{{ selectedTag.name }}</strong>
      <p>{{ selectedTag.definition }}</p>
    </div>
  </div>
</template>

<style scoped>
.tag-cloud {
  margin-top: var(--gap-md);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-sm);
}

.tag-definition {
  margin-top: var(--gap-md);
  padding: var(--gap-md);
  background: var(--c-bg);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
}

.tag-definition strong {
  display: block;
  margin-bottom: 4px;
  color: var(--c-text);
}

.tag-definition p {
  color: var(--c-text-secondary);
  line-height: 1.5;
}
</style>
