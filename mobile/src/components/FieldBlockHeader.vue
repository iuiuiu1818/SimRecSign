<script setup lang="ts">
import type { StepFieldBlock } from '@/utils/fieldBlocks'

const props = defineProps<{
  block: StepFieldBlock
  collapsed?: boolean
  collapsible?: boolean
  mode: 'editable' | 'readonly' | 'detail'
  fieldCount?: number
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

function onClick() {
  if (props.collapsible) emit('toggle')
}
</script>

<template>

  <div v-if="mode === 'editable'" class="block-header-row" :class="{ 'is-collapsible': collapsible }" @click="onClick">
    <van-icon v-if="collapsible" name="arrow" :class="['block-arrow', { 'block-arrow--open': !collapsed }]" />
    <span class="block-header-label">{{ block.label }}</span>
    <van-tag v-if="block.type === 'container'" color="#13c2c2" plain>行容器</van-tag>
    <van-tag v-else-if="block.type === 'group'" color="#fa8c16" plain>字段分组</van-tag>
    <van-tag v-else type="default" plain>独立字段</van-tag>
    <span v-if="collapsed" class="block-collapsed-hint">{{ fieldCount }} 项已折叠</span>
  </div>

  <div v-else-if="mode === 'readonly'" class="ro-block-header" :class="{ 'is-collapsible': collapsible }" @click="onClick">
    <van-icon v-if="collapsible" name="arrow" :class="['ro-block-arrow', { 'ro-block-arrow--open': !collapsed }]" />
    <span class="ro-block-label">{{ block.label }}</span>
    <van-tag v-if="block.type === 'container'" color="#13c2c2" plain>行容器</van-tag>
    <van-tag v-else-if="block.type === 'group'" color="#fa8c16" plain>字段分组</van-tag>
    <van-tag v-else type="default" plain>独立字段</van-tag>
    <span v-if="collapsed" class="ro-block-hint">已折叠 · {{ fieldCount }} 项</span>
  </div>

  <div v-else class="detail-block-header">
    <span class="detail-block-label">{{ block.label }}</span>
    <van-tag v-if="block.type === 'container'" color="#13c2c2" plain>行容器</van-tag>
    <van-tag v-else-if="block.type === 'group'" color="#fa8c16" plain>字段分组</van-tag>
    <van-tag v-else type="default" plain>独立字段</van-tag>
  </div>
</template>

<style scoped>

.block-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 6px;
}
.block-header-row.is-collapsible {
  cursor: pointer;
  user-select: none;
}
.block-header-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--srs-text-primary);
}
.block-arrow {
  font-size: 13px;
  color: var(--srs-text-tertiary);
  transition: transform .2s ease;
  flex-shrink: 0;
}
.block-arrow--open {
  transform: rotate(90deg);
}
.block-collapsed-hint {
  font-size: 12px;
  color: var(--srs-text-tertiary);
  margin-left: auto;
  white-space: nowrap;
}

.ro-block-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 6px;
}
.ro-block-header.is-collapsible {
  cursor: pointer;
  user-select: none;
}
.ro-block-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--srs-text-primary);
}
.ro-block-arrow {
  font-size: 13px;
  color: var(--srs-text-tertiary);
  transition: transform .2s ease;
  flex-shrink: 0;
}
.ro-block-arrow--open {
  transform: rotate(90deg);
}
.ro-block-hint {
  font-size: 12px;
  color: var(--srs-text-tertiary);
  margin-left: auto;
  white-space: nowrap;
}

.detail-block-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.detail-block-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--srs-text-primary);
}
</style>
