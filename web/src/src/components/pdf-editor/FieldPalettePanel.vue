<script setup lang="ts">
import { computed, ref } from 'vue'
import { CONTAINER_TYPES, FIELD_TYPES, DRAG_TYPE_MIME, isContainerOrGroupType, typeDefOf } from './fieldTypes'

const props = defineProps<{
  fields: any[]
  selectedIndex: number | null
  armedType: string | null
}>()

const emit = defineEmits<{
  arm: [type: string]
  select: [index: number]
  remove: [index: number]
  move: [from: number, to: number]
  copyGroup: [index: number]
}>()

function onPaletteDragStart(type: string, e: DragEvent) {
  if (!e.dataTransfer) return
  e.dataTransfer.setData(DRAG_TYPE_MIME, type)
  e.dataTransfer.effectAllowed = 'copy'
}

interface OutlineNode {
  field: any
  index: number
  children: OutlineNode[]
  depth: number
}

const outlineNodes = computed<OutlineNode[]>(() => {
  const containers: OutlineNode[] = []
  const groups: OutlineNode[] = []
  const widgets: OutlineNode[] = []

  props.fields.forEach((f, i) => {
    const node: OutlineNode = { field: f, index: i, children: [], depth: 0 }
    if (f.type === 'container') {
      containers.push(node)
    } else if (f.type === 'group') {
      groups.push(node)
    } else {
      widgets.push(node)
    }
  })

  for (const g of groups) {
    if (g.field.groupKey) {
      const parent = containers.find(c => c.field.key === g.field.groupKey)
      if (parent) {
        g.depth = 1
        parent.children.push(g)
        continue
      }
    }
    g.depth = 0
  }

  const free: OutlineNode[] = []
  for (const w of widgets) {
    const parentKey = w.field.groupKey
    if (parentKey) {
      let parent = groups.find(g => g.field.key === parentKey)
      if (!parent) {
        parent = containers.find(c => c.field.key === parentKey)
      }
      if (parent) {
        w.depth = parent.depth + 1
        parent.children.push(w)
        continue
      }
    }
    free.push(w)
  }

  return [...containers, ...groups, ...free]
})

const dragIndex = ref(-1)
const dragOverIndex = ref(-1)

const expandedKeys = ref<Set<string>>(new Set())

function toggleExpand(key: string) {
  const s = new Set(expandedKeys.value)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  expandedKeys.value = s
}

function onRowDragStart(index: number, e: DragEvent) {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function onRowDragOver(index: number, e: DragEvent) {
  if (dragIndex.value < 0 || index === dragIndex.value) return
  e.dataTransfer!.dropEffect = 'move'
  dragOverIndex.value = index
}

function onRowDrop(index: number) {
  const from = dragIndex.value
  if (from >= 0 && from !== index) emit('move', from, index)
  onRowDragEnd()
}

function onRowDragEnd() {
  dragIndex.value = -1
  dragOverIndex.value = -1
}

function pageNo(f: any): number {
  return (f.pageIndex ?? 0) + 1
}

function outlineDepthStyle(depth: number) {
  return { paddingLeft: (12 + depth * 16) + 'px' }
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
          :title="`点击后在 PDF 上放置，或直接拖入画布`"
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
          :title="`点击后在 PDF 上放置，或直接拖入画布`"
          @dragstart="onPaletteDragStart(t.value, $event)"
          @click="emit('arm', t.value)"
        >
          <el-icon :color="t.color" :size="16"><component :is="t.icon" /></el-icon>
          <span class="palette-label">{{ t.label }}</span>
        </div>
      </div>
    </div>

    <div class="outline-section">
      <div class="section-title">大纲 ({{ fields.length }})</div>
      <div class="outline-list">
        <template v-for="node in outlineNodes" :key="node.index">

          <div
            class="outline-item"
            :class="{
              active: selectedIndex === node.index,
              'drag-over': dragOverIndex === node.index,
              dragging: dragIndex === node.index,
            }"
            :style="outlineDepthStyle(node.depth)"
            draggable="true"
            @click="emit('select', node.index)"
            @dragstart="onRowDragStart(node.index, $event)"
            @dragover.prevent="onRowDragOver(node.index, $event)"
            @dragleave="dragOverIndex = -1"
            @drop.prevent="onRowDrop(node.index)"
            @dragend="onRowDragEnd"
          >
            <el-icon
              v-if="node.children.length"
              class="expand-icon"
              :size="12"
              @click.stop="toggleExpand(node.field.key)"
            >
              <ArrowRight v-if="!expandedKeys.has(node.field.key)" />
              <ArrowDown v-else />
            </el-icon>
            <span class="indent-placeholder" v-else />
            <el-icon class="drag-handle" :size="12"><Rank /></el-icon>
            <el-icon :color="typeDefOf(node.field.type).color" :size="14">
              <component :is="typeDefOf(node.field.type).icon" />
            </el-icon>
            <span class="item-name">{{ node.field.label || node.field.key }}</span>
            <span class="item-page">P{{ pageNo(node.field) }}</span>
            <el-icon
              v-if="isContainerOrGroupType(node.field.type)"
              class="item-copy"
              :size="12"
              title="复制组"
              @click.stop="emit('copyGroup', node.index)"
            ><CopyDocument /></el-icon>
            <el-icon class="item-delete" :size="12" @click.stop="emit('remove', node.index)"><Close /></el-icon>
          </div>

          <template v-if="node.children.length && expandedKeys.has(node.field.key)">
            <template v-for="child in node.children" :key="child.index">
              <div
                class="outline-item"
                :class="{
                  active: selectedIndex === child.index,
                  'drag-over': dragOverIndex === child.index,
                  dragging: dragIndex === child.index,
                }"
                :style="outlineDepthStyle(child.depth)"
                draggable="true"
                @click="emit('select', child.index)"
                @dragstart="onRowDragStart(child.index, $event)"
                @dragover.prevent="onRowDragOver(child.index, $event)"
                @dragleave="dragOverIndex = -1"
                @drop.prevent="onRowDrop(child.index)"
                @dragend="onRowDragEnd"
              >
                <el-icon
                  v-if="child.children.length"
                  class="expand-icon"
                  :size="12"
                  @click.stop="toggleExpand(child.field.key)"
                >
                  <ArrowRight v-if="!expandedKeys.has(child.field.key)" />
                  <ArrowDown v-else />
                </el-icon>
                <span class="indent-placeholder" v-else />
                <el-icon class="drag-handle" :size="12"><Rank /></el-icon>
                <el-icon :color="typeDefOf(child.field.type).color" :size="14">
                  <component :is="typeDefOf(child.field.type).icon" />
                </el-icon>
                <span class="item-name">{{ child.field.label || child.field.key }}</span>
                <span class="item-page">P{{ pageNo(child.field) }}</span>
                <el-icon
                  v-if="isContainerOrGroupType(child.field.type)"
                  class="item-copy"
                  :size="12"
                  title="复制组"
                  @click.stop="emit('copyGroup', child.index)"
                ><CopyDocument /></el-icon>
                <el-icon class="item-delete" :size="12" @click.stop="emit('remove', child.index)"><Close /></el-icon>
              </div>

              <div
                v-for="gc in child.children"
                :key="gc.index"
                class="outline-item"
                :class="{
                  active: selectedIndex === gc.index,
                  'drag-over': dragOverIndex === gc.index,
                  dragging: dragIndex === gc.index,
                }"
                :style="outlineDepthStyle(gc.depth)"
                draggable="true"
                @click="emit('select', gc.index)"
                @dragstart="onRowDragStart(gc.index, $event)"
                @dragover.prevent="onRowDragOver(gc.index, $event)"
                @dragleave="dragOverIndex = -1"
                @drop.prevent="onRowDrop(gc.index)"
                @dragend="onRowDragEnd"
              >
                <span class="indent-placeholder" />
                <span class="indent-placeholder" />
                <el-icon class="drag-handle" :size="12"><Rank /></el-icon>
                <el-icon :color="typeDefOf(gc.field.type).color" :size="14">
                  <component :is="typeDefOf(gc.field.type).icon" />
                </el-icon>
                <span class="item-name">{{ gc.field.label || gc.field.key }}</span>
                <span class="item-page">P{{ pageNo(gc.field) }}</span>
                <el-icon class="item-delete" :size="12" @click.stop="emit('remove', gc.index)"><Close /></el-icon>
              </div>
            </template>
          </template>
        </template>
        <div v-if="fields.length === 0" class="outline-empty">
          从上方选择容器/控件<br />在 PDF 上点击或框选放置
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.palette-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
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

.outline-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px 12px 8px;
  border-top: 1px solid #f1f5f9;
  margin-top: 8px;
  overflow: hidden;
}

.outline-list {
  flex: 1;
  overflow-y: auto;
}

.outline-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #334155;
  border: 1px solid transparent;
  transition: background 0.15s;
}

.outline-item:hover {
  background: #f5f7fa;
}

.outline-item.active {
  background: #ecf5ff;
  border-color: #b3d8ff;
  color: #409eff;
}

.outline-item.dragging {
  opacity: 0.4;
}

.outline-item.drag-over {
  border-top: 2px solid #409eff;
}

.drag-handle {
  color: #cbd5e1;
  cursor: grab;
  flex-shrink: 0;
}

.expand-icon {
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
}

.expand-icon:hover {
  color: #409eff;
}

.indent-placeholder {
  width: 12px;
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-page {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
}

.item-copy {
  color: #cbd5e1;
  flex-shrink: 0;
}

.item-copy:hover {
  color: #409eff;
}

.item-delete {
  color: #cbd5e1;
  flex-shrink: 0;
}

.item-delete:hover {
  color: #f56c6c;
}

.outline-empty {
  text-align: center;
  padding: 24px 8px;
  color: #c0c4cc;
  font-size: 12px;
  line-height: 1.8;
}
</style>
