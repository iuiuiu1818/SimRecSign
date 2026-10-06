<script setup lang="ts">
import { CONTAINER_TYPES, FIELD_TYPES, DRAG_TYPE_MIME } from './fieldTypes'

defineProps<{
  armedType: string | null
}>()

const emit = defineEmits<{
  arm: [type: string]
}>()

function onPaletteDragStart(type: string, e: DragEvent) {
  if (!e.dataTransfer) return
  e.dataTransfer.setData(DRAG_TYPE_MIME, type)
  e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <div class="palette-panel">
    <div class="palette-section">
      <div class="section-title">容器</div>
      <div class="palette-grid">
        <div
          v-for="t in CONTAINER_TYPES"
          :key="t.value"
          class="palette-item"
          :class="{ armed: armedType === t.value }"
          draggable="true"
          title="点击后在 PDF 上放置，或直接拖入画布"
          @dragstart="onPaletteDragStart(t.value, $event)"
          @click="emit('arm', t.value)"
        >
          <el-icon :color="t.color" :size="16"><component :is="t.icon" /></el-icon>
          <span class="palette-label">{{ t.label }}</span>
        </div>
      </div>
    </div>

    <div class="palette-section">
      <div class="section-title">控件</div>
      <div class="palette-grid">
        <div
          v-for="t in FIELD_TYPES"
          :key="t.value"
          class="palette-item"
          :class="{ armed: armedType === t.value }"
          draggable="true"
          title="点击后在 PDF 上放置，或直接拖入画布"
          @dragstart="onPaletteDragStart(t.value, $event)"
          @click="emit('arm', t.value)"
        >
          <el-icon :color="t.color" :size="16"><component :is="t.icon" /></el-icon>
          <span class="palette-label">{{ t.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.palette-panel {
  display: flex;
  flex-direction: column;
}

.palette-section {
  padding: 12px 12px 4px;
  flex-shrink: 0;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #f1f5f9;
}

.palette-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid #e8ecf1;
  border-radius: 6px;
  cursor: grab;
  font-size: 12px;
  color: #475569;
  background: #fff;
  transition: border-color 0.15s, background 0.15s;
  user-select: none;
}

.palette-item:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.palette-item.armed {
  border-color: #409eff;
  background: #409eff;
  color: #fff;
}

.palette-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>