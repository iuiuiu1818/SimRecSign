<script setup lang="ts">
import { typeDefOf } from './fieldTypes'
import FieldRect from './FieldRect.vue'

const props = defineProps<{
  containers: any[]
  groups: any[]
  widgets: any[]
  selectedIndex: number | null
  armedType: string | null
  isDragging: boolean
  drawRect: { x: number; y: number; w: number; h: number } | null
  pageScale: number
}>()

const emit = defineEmits<{
  overlayMousedown: [e: MouseEvent]
  drop: [e: DragEvent]
  fieldMousedown: [e: MouseEvent, fieldIndex: number]
  resize: [e: MouseEvent, handle: string]
  copy: [fieldIndex: number]
  remove: [fieldIndex: number]
}>()
</script>

<template>
  <div
    class="field-overlay"
    :class="{ armed: !!armedType }"
    @mousedown="emit('overlayMousedown', $event)"
    @dragover.prevent
    @drop="emit('drop', $event)"
  >

    <FieldRect
      v-for="field in containers"
      :key="field._index"
      :field="field"
      :selected="selectedIndex === field._index"
      :page-scale="pageScale"
      kind="container"
      @mousedown="emit('fieldMousedown', $event, field._index)"
      @resize="(e, handle) => emit('resize', e, handle)"
      @copy="emit('copy', field._index)"
      @remove="emit('remove', field._index)"
    />

    <FieldRect
      v-for="field in groups"
      :key="field._index"
      :field="field"
      :selected="selectedIndex === field._index"
      :dragging="isDragging && selectedIndex === field._index"
      :page-scale="pageScale"
      kind="group"
      @mousedown="emit('fieldMousedown', $event, field._index)"
      @resize="(e, handle) => emit('resize', e, handle)"
      @remove="emit('remove', field._index)"
    />

    <FieldRect
      v-for="field in widgets"
      :key="field._index"
      :field="field"
      :selected="selectedIndex === field._index"
      :dragging="isDragging && selectedIndex === field._index"
      :page-scale="pageScale"
      kind="widget"
      @mousedown="emit('fieldMousedown', $event, field._index)"
      @resize="(e, handle) => emit('resize', e, handle)"
      @remove="emit('remove', field._index)"
    />

    <div
      v-if="drawRect"
      class="draw-preview"
      :style="{ left: drawRect.x + 'px', top: drawRect.y + 'px', width: drawRect.w + 'px', height: drawRect.h + 'px' }"
    />

    <div v-if="armedType" class="armed-hint">
      <el-icon><Pointer /></el-icon>
      <span>单击放置默认尺寸，拖拽框选自定义大小：{{ typeDefOf(armedType).label }}</span>
    </div>
  </div>
</template>

<style scoped>

.field-overlay {
  position: absolute;
  inset: 0;
  cursor: default;
}

.field-overlay.armed {
  cursor: crosshair;
}

.draw-preview {
  position: absolute;
  border: 1.5px dashed #409eff;
  background: rgba(64, 158, 255, 0.1);
  pointer-events: none;
  z-index: 50;
}

.armed-hint {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(64, 158, 255, 0.92);
  color: #fff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 100;
}
</style>