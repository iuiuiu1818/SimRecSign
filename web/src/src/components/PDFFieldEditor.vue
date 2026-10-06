<script setup lang="ts">
import { ref, computed } from 'vue'
import FieldPalette from './pdf-editor/FieldPalette.vue'
import OutlineTree from './pdf-editor/OutlineTree.vue'
import FieldPropertyPanel from './pdf-editor/FieldPropertyPanel.vue'
import FieldOverlay from './pdf-editor/FieldOverlay.vue'
import { isContainerType, isContainerOrGroupType, typeDefOf } from './pdf-editor/fieldTypes'
import { usePdfRenderer } from '../composables/usePdfRenderer'
import { useFieldInteractions } from '../composables/useFieldInteractions'

const props = withDefaults(defineProps<{
  pdfUrl: string
  fields: any[]
  embedded?: boolean
}>(), { embedded: false })

const emit = defineEmits<{
  'update:fields': [fields: any[]]
  back: []
  next: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const {
  currentPage,
  totalPages,
  scale,
  pageScale,
  loading,
  pageError,
  pageWidth,
  pageHeight,
  zoomPercent,
  MIN_SCALE,
  MAX_SCALE,
  goToPage,
  zoomIn,
  zoomOut,
  resetZoom,
  onWheel,
  getRelativePos,
} = usePdfRenderer(
  computed(() => props.pdfUrl),
  canvasRef
)

const {
  selectedFieldIndex,
  armedType,
  isDragging,
  drawRect,
  selectField,
  armType,
  handleDrop,
  handleOverlayMouseDown,
  handleFieldMouseDown,
  handleResizeStart,
  copyGroup,
  updateFieldProperty,
  deleteField,
  moveField,
} = useFieldInteractions({
  fields: computed(() => props.fields),
  currentPage,
  pageScale,
  canvasRef,
  getRelativePos,
  onFieldsChange: (updated) => emit('update:fields', updated),
})

const currentPageFields = computed(() =>
  props.fields
    .map((f, i) => ({
      ...f,
      _index: i,
      _def: typeDefOf(f.type),
      pageIndex: f.pageIndex !== undefined ? f.pageIndex : 0,
      rect: f.rect || [0, 0, 0, 0],
    }))
    .filter(f => f.pageIndex === currentPage.value - 1)
)

const currentPageContainers = computed(() => currentPageFields.value.filter(f => f.type === 'container'))
const currentPageGroups = computed(() => currentPageFields.value.filter(f => f.type === 'group'))
const currentPageWidgets = computed(() => currentPageFields.value.filter(f => !isContainerType(f.type) && f.type !== 'group'))

const selectedField = computed(() =>
  selectedFieldIndex.value === null ? null : props.fields[selectedFieldIndex.value] || null
)

const containersForPanel = computed(() =>
  props.fields.filter(f => isContainerOrGroupType(f.type) && f !== selectedField.value)
)

const widgetCount = computed(() => props.fields.filter(f => !isContainerType(f.type)).length)
const containerCount = computed(() => props.fields.filter(f => isContainerType(f.type)).length)

</script>

<template>
  <div class="pdf-editor">

    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-button v-if="!embedded" text bg @click="emit('back')">
          <el-icon><ArrowLeft /></el-icon>返回上传
        </el-button>
        <span class="toolbar-title">字段设计</span>
      </div>

      <div class="toolbar-center">

        <div class="zoom-group">
          <el-button text size="small" :disabled="scale <= MIN_SCALE" @click="zoomOut">
            <el-icon><ZoomOut /></el-icon>
          </el-button>
          <span class="zoom-text" title="点击重置缩放" @click="resetZoom">{{ zoomPercent }}%</span>
          <el-button text size="small" :disabled="scale >= MAX_SCALE" @click="zoomIn">
            <el-icon><ZoomIn /></el-icon>
          </el-button>
        </div>
        <el-divider direction="vertical" />

        <div class="page-nav">
          <el-button :disabled="currentPage <= 1" size="small" text @click="goToPage(currentPage - 1)">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <el-input-number
            v-model="currentPage"
            :min="1"
            :max="Math.max(1, totalPages)"
            size="small"
            controls-position="right"
            style="width: 72px"
            :disabled="totalPages === 0"
          />
          <span class="page-total">/ {{ totalPages }}</span>
          <el-button :disabled="currentPage >= totalPages" size="small" text @click="goToPage(currentPage + 1)">
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>

      <div class="toolbar-right">
        <el-button v-if="!embedded" type="primary" @click="emit('next')">下一步：配置步骤</el-button>
      </div>
    </div>

    <div class="editor-body">

      <aside class="left-panel">
        <FieldPalette
          :armed-type="armedType"
          @arm="armType"
        />
        <OutlineTree
          :fields="props.fields"
          :selected-index="selectedFieldIndex"
          @select="selectField"
          @remove="deleteField"
          @move="moveField"
          @copy-group="copyGroup"
        />
      </aside>

      <div class="pdf-area" @wheel.prevent="onWheel">

        <div v-if="loading" class="pdf-overlay">
          <div class="pdf-overlay-content">
            <el-icon class="is-loading" :size="32"><Loading /></el-icon>
            <span>加载 PDF 中...</span>
          </div>
        </div>
        <div v-else-if="pageError" class="pdf-overlay">
          <div class="pdf-overlay-content">
            <el-result icon="error" title="加载失败" :sub-title="pageError" />
          </div>
        </div>
        <div v-else-if="!pdfUrl" class="pdf-overlay">
          <div class="pdf-overlay-content">
            <el-empty description="该模板没有关联的 PDF 文件" />
          </div>
        </div>

        <div
          class="canvas-wrapper"
          :style="{ width: pageWidth + 'px', height: pageHeight + 'px', visibility: loading || pageError || !pdfUrl ? 'hidden' : 'visible' }"
        >
          <canvas ref="canvasRef" class="pdf-canvas" />

          <FieldOverlay
            :containers="currentPageContainers"
            :groups="currentPageGroups"
            :widgets="currentPageWidgets"
            :selected-index="selectedFieldIndex"
            :armed-type="armedType"
            :is-dragging="isDragging"
            :draw-rect="drawRect"
            :page-scale="pageScale"
            @overlay-mousedown="handleOverlayMouseDown"
            @drop="handleDrop"
            @field-mousedown="handleFieldMouseDown"
            @resize="handleResizeStart"
            @copy="copyGroup"
            @remove="deleteField"
          />
        </div>
      </div>

      <aside class="right-panel">
        <FieldPropertyPanel
          :field="selectedField"
          :containers="containersForPanel"
          :field-count="widgetCount"
          :container-count="containerCount"
          @update="updateFieldProperty"
          @remove="selectedFieldIndex !== null && deleteField(selectedFieldIndex)"
          @copy-group="selectedFieldIndex !== null && copyGroup(selectedFieldIndex)"
        />
      </aside>
    </div>

    <div class="status-bar">
      <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
      <span>字段 {{ widgetCount }} · 容器 {{ containerCount }}</span>
      <span v-if="selectedField">已选中：{{ selectedField.label || selectedField.key }}</span>
      <span v-else class="muted">未选中字段</span>
      <span class="status-spacer" />
      <span class="muted">左侧选择控件 → 画布点击/框选/拖入放置 · Delete 删除选中 · Ctrl+滚轮缩放</span>
    </div>
  </div>
</template>

<style scoped>
.pdf-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
  background: #f5f7fa;
  border-radius: 4px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #fff;
  border-bottom: 1px solid #e8ecf1;
  flex-shrink: 0;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.zoom-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.zoom-text {
  font-size: 12px;
  color: #475569;
  min-width: 44px;
  text-align: center;
  cursor: pointer;
  user-select: none;
}

.zoom-text:hover {
  color: #409eff;
}

.page-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-total {
  font-size: 13px;
  color: #94a3b8;
}

.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  width: 236px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #e8ecf1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.left-panel > :last-child {
  flex: 1;
  min-height: 0;
}

.right-panel {
  width: 300px;
  flex-shrink: 0;
  background: #fff;
  border-left: 1px solid #e8ecf1;
  overflow: hidden;
}

.pdf-area {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px;
  background: #f1f5f9;
  position: relative;
}

.pdf-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  z-index: 10;
}

.pdf-overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #64748b;
}

.canvas-wrapper {
  position: relative;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  background: #fff;
  flex-shrink: 0;
}

.pdf-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 28px;
  padding: 0 12px;
  background: #fff;
  border-top: 1px solid #e8ecf1;
  font-size: 12px;
  color: #475569;
  flex-shrink: 0;
}

.status-bar .muted {
  color: #94a3b8;
}

.status-spacer {
  flex: 1;
}
</style>
