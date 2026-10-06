<script setup lang="ts">
import { computed } from 'vue'
import { rectStyle } from './pdfCoords'

const props = withDefaults(defineProps<{
  field: any
  selected: boolean
  dragging?: boolean
  kind?: 'container' | 'group' | 'widget'
  pageScale: number
}>(), {
  dragging: false,
  kind: 'widget',
})

const emit = defineEmits<{
  mousedown: [e: MouseEvent, fieldIndex: number]
  resize: [e: MouseEvent, handle: string]
  copy: [fieldIndex: number]
  remove: [fieldIndex: number]
}>()

const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const

const rectClass = computed(() => ({
  'field-rect': true,
  'container-rect': props.kind === 'container',
  'group-rect': props.kind === 'group',
  'field-selected': props.selected,
  'field-dragging': props.dragging,
}))

const labelClass = computed(() => ({
  'field-label': true,
  'container-label': props.kind === 'container',
  'group-label': props.kind === 'group',
}))

function onHandleMouseDown(e: MouseEvent, handle: string) {
  e.stopPropagation()
  e.preventDefault()
  emit('resize', e, handle)
}
</script>

<template>
  <div
    :class="rectClass"
    :style="rectStyle(pageScale, field, selected ? field._index : null)"
    @mousedown="(e) => emit('mousedown', e, field._index)"
  >
    <div :class="labelClass">
      <el-icon :size="12"><component :is="field._def.icon" /></el-icon>
      <span class="field-name">{{ field.label }}</span>
      <span v-if="kind === 'widget' && field.required" class="field-required">*</span>
    </div>

    <template v-if="selected">
      <div class="resize-handles">
        <div
          v-for="handle in RESIZE_HANDLES"
          :key="handle"
          :class="'resize-handle resize-' + handle"
          @mousedown="onHandleMouseDown($event, handle)"
        />
      </div>

      <el-button
        v-if="kind === 'container'"
        class="field-copy-btn"
        size="small"
        type="primary"
        circle
        @click.stop="emit('copy', field._index)"
      >
        <el-icon :size="10"><CopyDocument /></el-icon>
      </el-button>
      <el-button
        class="field-delete-btn"
        size="small"
        type="danger"
        circle
        @click.stop="emit('remove', field._index)"
      >
        <el-icon :size="10"><Close /></el-icon>
      </el-button>
    </template>
  </div>
</template>

<style scoped>

.field-rect {
  position: absolute;
  border: 1.5px solid;
  border-radius: 3px;
  cursor: move;
  box-sizing: border-box;
  min-width: 20px;
  min-height: 16px;
  z-index: 10;
  user-select: none;
  -webkit-user-select: none;

  touch-action: none;
}

.field-rect.field-selected {
  border-width: 2px;
  z-index: 20;
}

.field-rect.field-dragging {
  opacity: 0.8;
}

.container-rect {
  border-style: dashed;
  z-index: 5;
}

.container-rect.field-selected {
  z-index: 40;
}

.group-rect {
  border-style: solid;
  background-color: rgba(250, 140, 22, 0.06);
  z-index: 7;
}

.group-rect.field-selected {
  z-index: 40;
}

.group-label {
  background: rgba(250, 140, 22, 0.1);
  border-radius: 2px;
  font-weight: 500;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 1px 4px;
  font-size: 11px;
  color: #1d2129;
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
  pointer-events: none;
  line-height: 1.4;
}

.container-label {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 2px;
}

.field-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.field-required {
  color: #f56c6c;
  flex-shrink: 0;
}

.resize-handles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #fff;
  border: 2px solid #409eff;
  border-radius: 1px;
  pointer-events: auto;
  z-index: 30;
  box-sizing: border-box;
}

.resize-handle:hover {
  background: #409eff;
}

.resize-nw { top: -5px; left: -5px; cursor: nw-resize; }
.resize-n { top: -5px; left: 50%; margin-left: -4px; cursor: n-resize; }
.resize-ne { top: -5px; right: -5px; cursor: ne-resize; }
.resize-e { top: 50%; right: -5px; margin-top: -4px; cursor: e-resize; }
.resize-se { bottom: -5px; right: -5px; cursor: se-resize; }
.resize-s { bottom: -5px; left: 50%; margin-left: -4px; cursor: s-resize; }
.resize-sw { bottom: -5px; left: -5px; cursor: sw-resize; }
.resize-w { top: 50%; left: -5px; margin-top: -4px; cursor: w-resize; }

.field-delete-btn {
  position: absolute;
  top: -12px;
  right: -12px;
  z-index: 40;
  width: 20px;
  height: 20px;
  --el-button-size: 20px;
}

.field-copy-btn {
  position: absolute;
  top: -12px;
  right: 14px;
  z-index: 40;
  width: 20px;
  height: 20px;
  --el-button-size: 20px;
}
</style>