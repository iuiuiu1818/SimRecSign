<script setup lang="ts">
import { computed } from 'vue'
import { FIELD_TYPES, isContainerType, isContainerOrGroupType, typeDefOf } from './fieldTypes'

const props = defineProps<{
  field: any | null
  containers: any[]
  fieldCount: number
  containerCount: number
}>()

const emit = defineEmits<{
  update: [key: string, value: any]
  remove: []
  copyGroup: []
}>()

const def = computed(() => (props.field ? typeDefOf(props.field.type) : null))
const isContainer = computed(() => (props.field ? isContainerType(props.field.type) : false))
const isGroupContainer = computed(() => (props.field ? isContainerOrGroupType(props.field.type) : false))

const keyPrefix = computed(() => {
  if (!props.field) return ''
  const f = props.field
  if (isContainerType(f.type) || f.type === 'group') return ''
  const idx = f.key.lastIndexOf('__')
  return idx >= 0 ? f.key.slice(0, idx + 2) : ''
})
const localKey = computed(() => {
  if (!props.field) return ''
  const f = props.field
  if (isContainerType(f.type) || f.type === 'group') return f.key
  const idx = f.key.lastIndexOf('__')
  return idx >= 0 ? f.key.slice(idx + 2) : f.key
})

function updateKey(local: string) {
  if (!props.field) return
  const fullKey = keyPrefix.value + local
  if (fullKey !== props.field.key) {
    emit('update', 'key', fullKey)
  }
}

const hasOptions = computed(() => ['checkbox', 'radio', 'select'].includes(props.field?.type))

const optionList = computed<string[]>(() =>
  Array.isArray(props.field?.options) ? props.field.options : []
)

function update(key: string, value: any) {
  emit('update', key, value)
}

function rectVal(i: number): number {
  return Math.round((props.field?.rect?.[i] ?? 0) * 100) / 100
}

function setRect(i: number, v: number | undefined) {
  const rect = [...(props.field?.rect || [0, 0, 0, 0])]
  rect[i] = Math.round(Math.max(i >= 2 ? 4 : 0, v ?? 0) * 100) / 100
  update('rect', rect)
}

function setOption(oi: number, v: string) {
  const opts = [...(props.field?.options || [])]
  opts[oi] = v
  update('options', opts)
}

function addOption() {
  update('options', [...(props.field?.options || []), ''])
}

function removeOption(oi: number) {
  update('options', (props.field?.options || []).filter((_: any, i: number) => i !== oi))
}
</script>

<template>
  <div class="property-panel">
    <template v-if="field && def">
      <div class="panel-header">
        <div class="panel-title">
          <el-icon :color="def.color" :size="16"><component :is="def.icon" /></el-icon>
          <span>{{ isContainer ? '容器属性' : '字段属性' }}</span>
        </div>
        <div class="panel-head-actions">
          <el-button
            v-if="isGroupContainer"
            type="primary"
            link
            size="small"
            @click="emit('copyGroup')"
          >
            <el-icon><CopyDocument /></el-icon>复制组
          </el-button>
          <el-button type="danger" link size="small" @click="emit('remove')">
            <el-icon><Delete /></el-icon>删除
          </el-button>
        </div>
      </div>

      <el-form label-position="top" size="small" class="prop-form">
        <el-form-item label="标识 Key">
          <div class="key-input-wrapper">
            <span v-if="keyPrefix" class="key-prefix">{{ keyPrefix }}</span>
            <el-input
              :model-value="localKey"
              placeholder="field_key"
              class="key-input"
              @update:model-value="(v: string) => updateKey(v)"
            />
          </div>
        </el-form-item>

        <el-form-item :label="isContainer ? '容器名称' : '显示名称'">
          <el-input :model-value="field.label" placeholder="显示名称" @update:model-value="(v: string) => update('label', v)" />
        </el-form-item>

        <el-form-item v-if="!isContainer" label="填写说明">
          <template #label>
            <span>
              填写说明
              <el-tooltip content="用户在填写页将看到此说明作为字段提示" placement="top">
                <el-icon style="color: #94a3b8; margin-left: 2px; vertical-align: middle;"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-input
            :model-value="field.description"
            type="textarea"
            :rows="2"
            placeholder="告知用户该字段应填写什么内容"
            @update:model-value="(v: string) => update('description', v)"
          />
        </el-form-item>

        <el-form-item v-if="!isContainer" label="字段类型">
          <el-select :model-value="field.type" style="width: 100%" @update:model-value="(v: string) => update('type', v)">
            <el-option v-for="t in FIELD_TYPES" :key="t.value" :label="t.label" :value="t.value">
              <span class="type-option">
                <el-icon :color="t.color" :size="14"><component :is="t.icon" /></el-icon>
                {{ t.label }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item v-if="!isContainer" label="必填">
          <el-switch :model-value="!!field.required" @update:model-value="(v: boolean) => update('required', v)" />
        </el-form-item>

        <el-form-item v-if="!isContainer" label="列表展示">
          <template #label>
            <span>
              列表展示
              <el-tooltip content="开启后，该字段值将显示在文档列表的关键信息列" placement="top">
                <el-icon style="color: #94a3b8; margin-left: 2px; vertical-align: middle;"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <el-switch :model-value="!!field.isKey" @update:model-value="(v: boolean) => update('isKey', v)" />
        </el-form-item>

        <el-form-item v-if="!isContainer && hasOptions" label="选项">
          <div class="options-editor">
            <div v-for="(opt, oi) in optionList" :key="oi" class="option-row">
              <el-input :model-value="opt" size="small" placeholder="选项值" @update:model-value="(v: string) => setOption(oi, v)" />
              <el-button size="small" type="danger" link @click="removeOption(oi)">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
            <el-button size="small" type="primary" link @click="addOption">
              <el-icon><Plus /></el-icon>添加选项
            </el-button>
          </div>
        </el-form-item>

        <el-form-item v-if="field.type === 'number'" label="数值范围">
          <div class="range-row">
            <el-input-number
              :model-value="field.minVal ?? undefined"
              :controls="false"
              placeholder="最小值"
              @update:model-value="(v: number | undefined) => update('minVal', v ?? null)"
            />
            <span class="range-sep">—</span>
            <el-input-number
              :model-value="field.maxVal ?? undefined"
              :controls="false"
              placeholder="最大值"
              @update:model-value="(v: number | undefined) => update('maxVal', v ?? null)"
            />
          </div>
        </el-form-item>

        <el-form-item v-if="field.type === 'text' || field.type === 'textarea'" label="正则校验">
          <el-input :model-value="field.regex" placeholder="如 ^1\d{10}$（留空不校验）" @update:model-value="(v: string) => update('regex', v)" />
        </el-form-item>

        <el-form-item v-if="field.type === 'signature'" label="签名形态">
          <el-radio-group :model-value="field.signType || 'handwriting'" @update:model-value="(v: string) => update('signType', v)">
            <el-radio value="handwriting">仅手写</el-radio>
            <el-radio value="stamp">仅印章</el-radio>
            <el-radio value="both">手写+印章</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="!isContainer && containers.length > 0" label="所属容器/分组">
          <el-select
            :model-value="field.groupKey || ''"
            clearable
            placeholder="不属于任何分组"
            style="width: 100%"
            @update:model-value="(v: string) => update('groupKey', v || '')"
          >
            <el-option v-for="c in containers" :key="c.key" :label="c.label || c.key" :value="c.key" />
          </el-select>
        </el-form-item>

        <el-form-item label="位置与尺寸">
          <div class="rect-grid">
            <div class="rect-cell">
              <span class="rect-label">X</span>
              <el-input-number :model-value="rectVal(0)" :precision="2" :controls="false" size="small" @update:model-value="(v: number | undefined) => setRect(0, v)" />
            </div>
            <div class="rect-cell">
              <span class="rect-label">Y</span>
              <el-input-number :model-value="rectVal(1)" :precision="2" :controls="false" size="small" @update:model-value="(v: number | undefined) => setRect(1, v)" />
            </div>
            <div class="rect-cell">
              <span class="rect-label">宽</span>
              <el-input-number :model-value="rectVal(2)" :precision="2" :controls="false" size="small" @update:model-value="(v: number | undefined) => setRect(2, v)" />
            </div>
            <div class="rect-cell">
              <span class="rect-label">高</span>
              <el-input-number :model-value="rectVal(3)" :precision="2" :controls="false" size="small" @update:model-value="(v: number | undefined) => setRect(3, v)" />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="所在页面">
          <el-tag size="small">第 {{ (field.pageIndex ?? 0) + 1 }} 页</el-tag>
        </el-form-item>
      </el-form>
    </template>

    <div v-else class="panel-empty">
      <el-icon :size="40" color="#c0c4cc"><Pointer /></el-icon>
      <p>点击画布上的字段进行编辑</p>
      <p class="sub-hint">从左侧选择容器/控件，在 PDF 上点击或框选放置</p>
      <div class="stats-row">
        <div class="stats-item">
          <span class="stats-num">{{ fieldCount }}</span>
          <span class="stats-label">字段</span>
        </div>
        <div class="stats-item">
          <span class="stats-num">{{ containerCount }}</span>
          <span class="stats-label">容器</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.property-panel {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.panel-head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.prop-form {
  --el-form-label-font-size: 12px;
}

.key-input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.key-prefix {
  flex-shrink: 0;
  padding: 0 4px 0 8px;
  font-size: 12px;
  color: #94a3b8;
  background: #f5f7fa;
  border-right: 1px solid #dcdfe6;
  line-height: 28px;
  user-select: none;
  white-space: nowrap;
}

.key-input-wrapper :deep(.el-input) {
  flex: 1;
}

.key-input-wrapper :deep(.el-input__wrapper) {
  border: none;
  box-shadow: none;
  border-radius: 0;
  padding-left: 8px;
}

.type-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.options-editor {
  width: 100%;
}

.option-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
  align-items: center;
}

.range-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.range-sep {
  color: #94a3b8;
  flex-shrink: 0;
}

.rect-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}

.rect-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rect-label {
  font-size: 12px;
  color: #94a3b8;
  flex-shrink: 0;
}

.rect-cell :deep(.el-input-number) {
  flex: 1;
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px;
  color: #909399;
  text-align: center;
}

.panel-empty p {
  margin: 12px 0 0;
  font-size: 14px;
}

.panel-empty .sub-hint {
  color: #c0c4cc;
  font-size: 12px;
  margin-top: 4px;
}

.stats-row {
  display: flex;
  gap: 32px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f1f5f9;
}

.stats-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stats-num {
  font-size: 22px;
  font-weight: 600;
  color: #0f172a;
}

.stats-label {
  font-size: 12px;
  color: #94a3b8;
}
</style>
