<script setup lang="ts">
import { useRouter } from 'vue-router'
import IconWeather from '@/components/icons/IconWeather.vue'
import type { WeatherInfo, OperationStatus } from '@/types/home'

const props = defineProps<{
  weather: WeatherInfo
  status: OperationStatus
}>()

const router = useRouter()

function goDaily() {
  router.push('/daily-report')
}
</script>

<template>
  <div class="weather-status">
    <div class="weather-card">
      <IconWeather :type="props.weather.type" />
      <div class="weather-info">
        <span class="weather-temp">{{ props.weather.temperature }}°C</span>
        <span class="weather-tip">{{ props.weather.tip }}</span>
      </div>
    </div>
    <div class="operation-card" @click="goDaily">
      <span v-if="props.status.normal" class="status-tag status-tag--normal">今日经营正常</span>
      <span v-else class="status-tag status-tag--abnormal">有{{ props.status.abnormalCount }}条异常待处理</span>
    </div>
    <div class="status-footer">
      <span>营业时间 {{ props.status.businessHours }}</span>
      <span>今日已接单 {{ props.status.todayOrders }} 单</span>
    </div>
  </div>
</template>

<style scoped>
.weather-status {
  height: 90px;
  margin: var(--gap-md) var(--gap-md) 0;
  background: var(--c-card);
  border-radius: var(--radius-lg);
  padding: var(--gap-md) var(--gap-lg);
  box-shadow: var(--shadow-sm);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap-md);
  position: relative;
}

.weather-card,
.operation-card {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}

.weather-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.weather-temp {
  font-size: var(--fs-md);
  font-weight: 600;
}

.weather-tip {
  font-size: var(--fs-xs);
  color: var(--c-text-secondary);
}

.operation-card {
  justify-content: flex-end;
  cursor: pointer;
}

.status-tag {
  padding: 6px 10px;
  border-radius: var(--radius-full);
  font-size: var(--fs-xs);
  font-weight: 500;
}

.status-tag--normal {
  background: var(--c-success-light);
  color: var(--c-success);
}

.status-tag--abnormal {
  background: var(--c-warning-light);
  color: var(--c-warning);
}

.status-footer {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  border-top: 1px solid var(--c-divider);
  padding-top: var(--gap-sm);
  margin-top: -2px;
}
</style>
