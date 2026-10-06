<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { HistoryCandidate } from '@/composables/useFieldHistory'

const props = defineProps<{
  show: boolean
  candidates: HistoryCandidate[]
  fieldLabel?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'pick', value: string | number): void
}>()

const visible = computed({
  get: () => props.show,
  set: (v) => emit('update:show', v),
})

const keyword = ref('')
watch(
  () => props.show,
  (v) => {
    if (v) keyword.value = ''
  },
)

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return props.candidates
  return props.candidates.filter((c) => String(c.value).toLowerCase().includes(q))
})

function display(c: HistoryCandidate): string {
  const s = String(c.value)
  return s.length > 30 ? s.slice(0, 30) + '…' : s
}

function pick(c: HistoryCandidate) {
  emit('pick', c.value)
  visible.value = false
}
</script>

<template>
  <van-popup v-model:show="visible" position="bottom" round closeable>
    <div class="hist-suggest">
      <div class="hist-header">
        <span class="hist-title">{{ fieldLabel ? `${fieldLabel} · 常用值` : '常用值' }}</span>
        <span class="hist-count">共 {{ candidates.length }} 条</span>
      </div>

      <van-field
        v-if="candidates.length > 6"
        v-model="keyword"
        placeholder="搜索历史值"
        clearable
        round
        class="hist-search"
      />

      <div v-if="loading" class="hist-empty">加载中…</div>

      <div v-else-if="filtered.length" class="hist-list">
        <van-cell
          v-for="(c, i) in filtered"
          :key="i"
          :title="display(c)"
          clickable
          @click="pick(c)"
        >
          <template v-if="c.useCount > 1" #label>
            近 {{ c.useCount }} 次使用
          </template>
          <template #right-icon>
            <van-icon name="share-o" class="hist-apply-icon" />
          </template>
        </van-cell>
      </div>

      <div v-else class="hist-empty">
        {{ keyword ? '没有匹配的常用值' : '该字段暂无历史常用值' }}
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.hist-suggest {
  padding: 20px 16px 24px;
  min-height: 200px;
  max-height: 70vh;
  overflow-y: auto;
}
.hist-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-right: 24px;
}
.hist-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--srs-text-primary);
}
.hist-count {
  font-size: 12px;
  color: var(--srs-text-tertiary);
}
.hist-search {
  margin-bottom: 8px;
}
.hist-list {
  margin: 0 -16px;
}
.hist-list :deep(.van-cell) {
  padding: 14px 16px;
}
.hist-list :deep(.van-cell__title) {
  color: var(--srs-text-primary);
  word-break: break-all;
}
.hist-apply-icon {
  color: var(--srs-text-tertiary);
  font-size: 16px;
}
.hist-empty {
  text-align: center;
  color: var(--srs-text-tertiary);
  font-size: 14px;
  padding: 40px 0;
}
</style>
