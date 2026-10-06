<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { HistoryCandidate } from '@/composables/useFieldHistory'

const props = defineProps<{
  fieldType: string
  modelValue: unknown
  candidates: HistoryCandidate[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'focus'): void
  (e: 'pick', value: string | number): void
}>()

const open = ref(false)
const activeIndex = ref(-1)
const listRef = ref<HTMLElement | null>(null)

const keyboardNav = computed(() => props.fieldType === 'text' || props.fieldType === 'textarea')

const visible = computed(() => open.value && props.candidates.length > 0 && !props.disabled)

function display(c: HistoryCandidate): string {
  const s = String(c.value)
  return s.length > 40 ? s.slice(0, 40) + '…' : s
}

function onFocusIn() {
  if (props.disabled) return
  emit('focus')
  open.value = true
}

function onModelChange() {
  if (props.candidates.length > 0) {
    open.value = true
    activeIndex.value = -1
  }
}

watch(() => props.modelValue, onModelChange)

watch(
  () => props.candidates,
  () => {
    if (activeIndex.value >= props.candidates.length) activeIndex.value = props.candidates.length - 1
  },
)

let blurTimer: ReturnType<typeof setTimeout> | null = null
function onFocusOut() {
  blurTimer = setTimeout(() => {
    open.value = false
    activeIndex.value = -1
  }, 120)
}
function cancelBlur() {
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
}

function pick(c: HistoryCandidate) {
  emit('pick', c.value)
  open.value = false
  activeIndex.value = -1
}

function scrollActiveIntoView() {
  nextTick(() => {
    const el = listRef.value?.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function onKeydown(e: KeyboardEvent) {
  if (!visible.value) return
  if (e.key === 'Escape') {
    open.value = false
    return
  }
  if (!keyboardNav.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, props.candidates.length - 1)
    scrollActiveIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    scrollActiveIntoView()
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault()
    pick(props.candidates[activeIndex.value])
  }
}
</script>

<template>
  <div
    class="hist-suggest"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @keydown="onKeydown"
  >
    <slot />
    <transition name="hist-fade">
      <div
        v-show="visible"
        ref="listRef"
        class="hist-panel"
        role="listbox"
        :aria-label="'常用值建议'"
        @focusin="cancelBlur"
      >
        <div
          v-for="(c, i) in candidates"
          :key="i"
          class="hist-item"
          :class="{ 'is-active': i === activeIndex }"
          :data-active="i === activeIndex"
          role="option"
          :aria-selected="i === activeIndex"
          :title="String(c.value)"
          @mousedown.prevent="pick(c)"
          @mouseenter="activeIndex = i"
        >
          <span class="hist-item-text">{{ display(c) }}</span>
          <span v-if="c.useCount > 1" class="hist-item-count">近 {{ c.useCount }} 次</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.hist-suggest {
  position: relative;
  width: 100%;
}
.hist-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 20;
  margin-top: 4px;
  max-height: 240px;
  overflow-y: auto;
  background: var(--srs-bg-card, #fff);
  border: 1px solid var(--srs-border, #dcdfe6);
  border-radius: var(--srs-radius-md, 8px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
}
.hist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 14px;
  font-size: 14px;
  color: var(--srs-text-primary, #303133);
  cursor: pointer;
  line-height: 1.4;
}
.hist-item.is-active {
  background: var(--srs-primary-bg, #ecf5ff);
  color: var(--srs-primary, #409eff);
}
.hist-item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hist-item-count {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--srs-text-tertiary, #909399);
}
.hist-fade-enter-active,
.hist-fade-leave-active {
  transition: opacity 0.15s ease;
}
.hist-fade-enter-from,
.hist-fade-leave-to {
  opacity: 0;
}
</style>