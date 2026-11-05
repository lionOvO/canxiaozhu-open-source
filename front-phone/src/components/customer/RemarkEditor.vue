<script setup lang="ts">
import { ref } from 'vue'
import TagPill from '@/components/common/TagPill.vue'

const props = defineProps<{
  remarks: string
  manualTags: string[]
}>()

const remarkText = ref(props.remarks)
const presetTags = ['带孩子', '不吃香菜', '常客', '忌口辣', 'VIP']
const selectedTags = ref<string[]>([...props.manualTags])

function toggleTag(tag: string) {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter((t) => t !== tag)
  } else {
    selectedTags.value.push(tag)
  }
}
</script>

<template>
  <div class="remark-editor card">
    <h3 class="section-title">客户备注与标签</h3>
    <textarea
      v-model="remarkText"
      class="remark-input"
      rows="2"
      placeholder="添加备注，如“每次来都带孩子”"
    />
    <div class="manual-tags">
      <span class="manual-tags-label">手动标签：</span>
      <TagPill
        v-for="tag in presetTags"
        :key="tag"
        category="behavior"
        :clickable="true"
        :style="{ opacity: selectedTags.includes(tag) ? 1 : 0.5 }"
        @click="toggleTag(tag)"
      >
        {{ tag }}
      </TagPill>
    </div>
  </div>
</template>

<style scoped>
.remark-editor {
  margin-top: var(--gap-md);
}

.remark-input {
  width: 100%;
  padding: var(--gap-md);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  resize: none;
  font-size: var(--fs-sm);
  margin-bottom: var(--gap-md);
}

.manual-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--gap-sm);
}

.manual-tags-label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
}
</style>
