<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { templateAPI } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import PDFFieldEditor from '@/components/PDFFieldEditor.vue'
import DeptTreePicker from '@/components/DeptTreePicker.vue'
import { buildStepFieldBlocks, collectBlockFieldKeys } from '@/composables/useStepFieldTree'
import { typeDefOf } from '@/components/pdf-editor/fieldTypes'

const route = useRoute()
const router = useRouter()
const tplId = route.params.id as string

const loading = ref(true)
const saving = ref(false)
const template = ref<any>(null)
const snapshot = ref<any>({ fields: [], steps: [] })

const activeTab = ref('basic')

const editForm = ref({
  name: '',
  category: '',
  description: '',
})

const hasChanges = ref(false)

const pdfUrl = ref('')
const pdfLoading = ref(false)
let pdfLoadSeq = 0

onMounted(() => {
  loadTemplate()
})

onUnmounted(() => {
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
})

const fields = ref<any[]>([])

const steps = ref<any[]>([])

const createdAt = ref('')
const updatedAt = ref('')

async function loadTemplate() {
  loading.value = true
  try {
    const res: any = await templateAPI.getDetail(tplId)
    const data = res.data
    template.value = data

    editForm.value = {
      name: data.name || '',
      category: data.category || '',
      description: data.description || '',
    }

    const snap = data.snapshot || { fields: [], steps: [] }
    snapshot.value = snap
    fields.value = (snap.fields || []).map((f: any, i: number) => ({
      ...f,
      order: f.order || i + 1,
    }))
    steps.value = (snap.steps || []).map((s: any) => ({
      ...s,
      fieldKeys: s.fieldKeys || [],
      assigneeTargets: s.assigneeTargets || [],
      assigneeTargetType: getDefaultTargetType(s.assigneeTargets || []),
    }))

    createdAt.value = data.createdAt || ''
    updatedAt.value = data.updatedAt || ''

    hasChanges.value = false

    if (data.hasPDF) {
      await loadPDF()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载模板失败')
    router.push('/templates')
  } finally {
    loading.value = false
  }
}

async function loadPDF() {
  const seq = ++pdfLoadSeq
  pdfLoading.value = true
  try {
    const token = localStorage.getItem('token')
    const resp = await fetch(templateAPI.getPDFUrl(tplId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!resp.ok) throw new Error('加载 PDF 失败')
    const blob = await resp.blob()
    if (seq !== pdfLoadSeq) return
    if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = URL.createObjectURL(blob)
  } catch (e: any) {
    console.warn('PDF 加载失败:', e)
    pdfUrl.value = ''
  } finally {
    if (seq === pdfLoadSeq) pdfLoading.value = false
  }
}

function onFieldChange(newFields: any[]) {
  fields.value = newFields
  hasChanges.value = true
}

function markChanged() {
  hasChanges.value = true
}

const stepFieldBlocks = computed(() => buildStepFieldBlocks(fields.value))

function occupiedKeysForStep(step: any): Set<string> {
  const occupied = new Set<string>()
  for (const s of steps.value) {
    if (s.order < step.order) {
      for (const k of s.fieldKeys || []) {
        occupied.add(k)
      }
    }
  }
  return occupied
}

function isBlockChecked(block: any, stepFieldKeys: string[]): boolean {
  const keys = collectBlockFieldKeys(block)
  if (keys.length === 0) return false
  return keys.every((k: string) => stepFieldKeys.includes(k))
}

function isBlockIndeterminate(block: any, stepFieldKeys: string[]): boolean {
  const keys = collectBlockFieldKeys(block)
  const checked = keys.filter((k: string) => stepFieldKeys.includes(k)).length
  return checked > 0 && checked < keys.length
}

function toggleBlock(block: any, step: any) {
  const keys = collectBlockFieldKeys(block)
  const occupied = occupiedKeysForStep(step)
  const blockedKeys = keys.filter((k: string) => occupied.has(k))
  if (blockedKeys.length > 0) {
    const labels = blockedKeys.map((k: string) => {
      const f = fields.value.find((ff: any) => ff.key === k)
      return f?.label || k
    }).join('、')
    ElMessage.warning(`以下字段已被占用，无法批量勾选：${labels}`)
    return
  }
  const allChecked = keys.every((k: string) => step.fieldKeys.includes(k))
  if (allChecked) {
    step.fieldKeys = step.fieldKeys.filter((k: string) => !keys.includes(k))
  } else {
    step.fieldKeys = [...new Set([...step.fieldKeys, ...keys])]
  }
  markChanged()
}

function toggleField(fieldKey: string, step: any) {
  const occupied = occupiedKeysForStep(step)
  if (occupied.has(fieldKey)) {
    const f = fields.value.find((ff: any) => ff.key === fieldKey)
    ElMessage.warning(`字段「${f?.label || fieldKey}」已被前面步骤占用，无法重复分配`)
    return
  }
  if (step.fieldKeys.includes(fieldKey)) {
    step.fieldKeys = step.fieldKeys.filter((k: string) => k !== fieldKey)
  } else {
    step.fieldKeys = [...step.fieldKeys, fieldKey]
  }
  markChanged()
}

function getDefaultTargetType(targets: any[]): string {
  if (!targets || targets.length === 0) return 'user'
  return targets[0].type || 'user'
}

function onAssigneeTargetTypeChange(step: any) {
  if (!step.assigneeTargets) step.assigneeTargets = []
  if (step.assigneeTargetType === 'org') {
    step.assigneeTargets = [{ type: 'org', id: '' }]
  }
  markChanged()
}

function getTargetIds(step: any, type: string): string[] {
  return (step.assigneeTargets || [])
    .filter((t: any) => t.type === type && t.id)
    .map((t: any) => t.id)
}

function setTargetIds(step: any, type: string, ids: string | string[] | null) {
  if (!step.assigneeTargets) step.assigneeTargets = []
  const list = Array.isArray(ids) ? ids : (ids ? [ids] : [])
  const others = step.assigneeTargets.filter((t: any) => t.type !== type)
  const merged = type === 'user'
    ? [...others, ...list.map((id: string) => ({ type, id }))]
    : [...others, ...list.slice(0, 1).map((id: string) => ({ type, id }))]
  step.assigneeTargets = merged
  markChanged()
}

function addStep() {
  const maxOrder = steps.value.reduce((max: number, s: any) => Math.max(max, s.order || 0), 0)
  steps.value.push({
    order: maxOrder + 1,
    label: `步骤${maxOrder + 1}`,
    assigneeType: 'fixed',
    assigneeTargets: [],
    fieldKeys: [],
    hiddenFields: [],
  })
  hasChanges.value = true
}

function removeStep(index: number) {
  if (steps.value.length <= 1) {
    ElMessage.warning('至少保留一个步骤')
    return
  }
  steps.value.splice(index, 1)
  steps.value.forEach((s: any, i: number) => { s.order = i + 1 })
  hasChanges.value = true
}

function moveStep(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= steps.value.length) return
  const temp = steps.value[index]
  steps.value[index] = steps.value[target]
  steps.value[target] = temp
  steps.value.forEach((s: any, i: number) => { s.order = i + 1 })
  hasChanges.value = true
}

async function handleSave() {
  if (!editForm.value.name) {
    ElMessage.warning('请输入模板名称')
    return
  }

  saving.value = true
  try {
    const payload: any = {
      name: editForm.value.name,
      category: editForm.value.category || '',
      description: editForm.value.description || '',
    }

    const snapshotFields = fields.value.map((f: any) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      isKey: f.isKey || false,
      regex: f.regex || '',
      minVal: f.minVal || null,
      maxVal: f.maxVal || null,
      options: f.options || [],
      groupKey: f.groupKey || '',
      signType: f.signType || '',
      description: f.description || '',
      order: f.order || 0,
      pageIndex: f.pageIndex ?? 0,
      rect: f.rect || [0, 0, 0, 0],
    }))

    const snapshotSteps = steps.value.map((s: any) => ({
      order: s.order,
      label: s.label,
      assigneeType: s.assigneeType || 'fixed',
      assigneeTargets: s.assigneeTargets || [],
      assigneeIds: (s.assigneeTargets || [])
        .filter((t: any) => t.type === 'user').map((t: any) => t.id),
      fieldKeys: s.fieldKeys || [],
      hiddenFields: s.hiddenFields || [],
    }))

    payload.fields = snapshotFields
    payload.steps = snapshotSteps

    await templateAPI.update(tplId, payload)
    ElMessage.success('保存成功')
    hasChanges.value = false
    await loadTemplate()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handlePublish() {
  try {
    await ElMessageBox.confirm('发布后模板将可供所有用户发起流程，确定发布？', '确认发布', {
      type: 'warning',
      confirmButtonText: '发布',
      cancelButtonText: '取消',
    })
    const token = localStorage.getItem('token')
    const resp = await fetch(`/api/v1/templates/${tplId}/publish`, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const data = await resp.json()
    if (data.code !== 0) throw new Error(data.msg)
    ElMessage.success('发布成功')
    await loadTemplate()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '发布失败')
  }
}

async function handleUnpublish() {
  try {
    await ElMessageBox.confirm('取消发布后模板将恢复为草稿状态，可重新编辑。确定取消发布？', '确认取消发布', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    const token = localStorage.getItem('token')
    const resp = await fetch(`/api/v1/templates/${tplId}/unpublish`, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const data = await resp.json()
    if (data.code !== 0) throw new Error(data.msg)
    ElMessage.success('已取消发布')
    await loadTemplate()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '操作失败')
  }
}

function handleBack() {
  if (hasChanges.value) {
    ElMessageBox.confirm('有未保存的更改，确定离开？', '提示', {
      confirmButtonText: '离开',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      router.push('/templates')
    }).catch(() => {})
  } else {
    router.push('/templates')
  }
}

const statusLabel = computed(() => {
  const status = template.value?.status
  if (status === 'published') return '已发布'
  if (status === 'disabled') return '已停用'
  return '草稿'
})

const statusType = computed(() => {
  const status = template.value?.status
  if (status === 'published') return 'success'
  if (status === 'disabled') return 'danger'
  return 'info'
})

const canEdit = computed(() => {
  return template.value?.status === 'draft'
})

const fieldTypeOptions = [
  { label: '单行文本', value: 'text' },
  { label: '多行文本', value: 'textarea' },
  { label: '数字', value: 'number' },
  { label: '日期', value: 'date' },
  { label: '勾选框', value: 'checkbox' },
  { label: '单选', value: 'radio' },
  { label: '下拉', value: 'select' },
  { label: '图片上传', value: 'image' },
  { label: '签名', value: 'signature' },
  { label: '审批意见', value: 'approval' },
  { label: '字段分组', value: 'group' },
  { label: '行容器', value: 'container' },
]

function getFieldTypeLabel(type: string): string {
  const opt = fieldTypeOptions.find(o => o.value === type)
  return opt?.label || type
}

function stepHasSignatureField(step: any): boolean {
  return step.fieldKeys?.some((key: string) => {
    const f = fields.value.find((ff: any) => ff.key === key)
    return f?.type === 'signature'
  }) || false
}

const EXPORT_FIELD_KEYS = [
  'key', 'label', 'type', 'required', 'isKey', 'regex', 'minVal', 'maxVal',
  'options', 'groupKey', 'signType', 'description', 'order', 'pageIndex', 'rect',
  'containerKey', 'containerRect', 'isContainer',
]

function sanitizeFieldForExport(f: any): any {
  const out: any = {}
  for (const k of EXPORT_FIELD_KEYS) {
    const v = f?.[k]
    if (v === undefined || v === '') continue
    if (k === 'required' || k === 'isKey' || k === 'isContainer') {
      if (v) out[k] = v
    } else {
      out[k] = v
    }
  }
  return out
}

function handleExportFields() {
  if (fields.value.length === 0) {
    ElMessage.warning('当前没有可导出的字段')
    return
  }
  const list = fields.value.map(sanitizeFieldForExport)
  const filename = `${editForm.value.name || '未命名模板'}_字段配置_${timestampForFilename()}.json`
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${list.length} 个字段`)
}

function timestampForFilename(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function validateImportedFields(data: any): { valid: boolean; error?: string } {
  if (!Array.isArray(data)) {
    return { valid: false, error: '字段数据应为数组格式' }
  }
  const seen = new Set<string>()
  for (let i = 0; i < data.length; i++) {
    const f = data[i]
    const idx = i + 1
    if (typeof f !== 'object' || f === null) {
      return { valid: false, error: `第 ${idx} 条不是有效的字段对象` }
    }
    if (typeof f.key !== 'string' || !f.key.trim()) {
      return { valid: false, error: `第 ${idx} 个字段缺少"key"属性` }
    }
    if (typeof f.label !== 'string' || !f.label.trim()) {
      return { valid: false, error: `字段 "${f.key}" 缺少"label"或"type"属性` }
    }
    if (typeof f.type !== 'string' || !f.type.trim()) {
      return { valid: false, error: `字段 "${f.key}" 缺少"label"或"type"属性` }
    }
    if (typeDefOf(f.type).value !== f.type) {
      return { valid: false, error: `字段 "${f.key}" 的类型 "${f.type}" 不合法` }
    }
    if (seen.has(f.key)) {
      return { valid: false, error: `字段 key "${f.key}" 重复` }
    }
    seen.add(f.key)
    if (f.rect !== undefined) {
      const ok = Array.isArray(f.rect) && f.rect.length === 4 && f.rect.every((n: any) => typeof n === 'number')
      if (!ok) return { valid: false, error: `字段 "${f.key}" 的 rect 格式错误` }
    }
    if (f.order !== undefined && f.order !== null && (!Number.isInteger(f.order) || f.order < 1)) {
      return { valid: false, error: `字段 "${f.key}" 的 order 应为正整数` }
    }
  }
  return { valid: true }
}

function handleImportFields() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        const check = validateImportedFields(data)
        if (!check.valid) {
          ElMessage.error(check.error || '导入失败')
          return
        }
        const imported: any[] = (data as any[]).map((f: any, i: number) => ({
          ...f,
          order: f.order ?? i + 1,
        }))
        ElMessageBox.confirm(
          `导入将覆盖现有 ${fields.value.length} 个字段，共导入 ${imported.length} 个新字段。确定继续？`,
          '确认导入',
          { type: 'warning', confirmButtonText: '覆盖导入', cancelButtonText: '取消' }
        ).then(() => {
          fields.value = imported
          hasChanges.value = true
          ElMessage.success(`成功导入 ${imported.length} 个字段，请点击"保存"持久化`)
        }).catch(() => {})
      } catch (e: any) {
        ElMessage.error(`JSON 解析失败: ${e?.message || '文件格式错误'}`)
      }
    }
    reader.onerror = () => {
      ElMessage.error('读取文件失败')
    }
    reader.readAsText(file)
  }
  input.click()
}
</script>

<template>
  <div class="page-container">

    <div class="page-header">
      <div class="header-left">
        <el-button text @click="handleBack" :icon="'ArrowLeft'" size="default">返回模板库</el-button>
        <div class="header-title-area">
          <h2 class="page-title" v-if="template">{{ editForm.name || '未命名模板' }}</h2>
          <el-tag v-if="template" :type="statusType" size="small" effect="plain">{{ statusLabel }}</el-tag>
        </div>
      </div>
      <div class="header-actions">
        <el-button v-if="canEdit" type="primary" :loading="saving" @click="handleSave" :disabled="!hasChanges">
          保存
        </el-button>
        <el-button v-if="template?.status === 'draft'" type="success" @click="handlePublish" plain>
          发布
        </el-button>
        <el-button v-if="template?.status === 'published'" type="warning" @click="handleUnpublish" plain>
          取消发布
        </el-button>
      </div>
    </div>

    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" style="font-size: 32px"><Loading /></el-icon>
      <span>加载模板中...</span>
    </div>

    <template v-if="!loading && template">

      <el-card shadow="never" class="content-card">
        <div class="info-bar">
          <div class="info-item">
            <span class="info-label">创建者</span>
            <span class="info-value">{{ template.createdBy?.slice(0, 8) || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">创建时间</span>
            <span class="info-value">{{ createdAt ? new Date(createdAt).toLocaleString() : '-' }}</span>
          </div>
          <div class="info-item" v-if="updatedAt">
            <span class="info-label">最后修改</span>
            <span class="info-value">{{ new Date(updatedAt).toLocaleString() }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">字段数</span>
            <span class="info-value">{{ fields.length }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">步骤数</span>
            <span class="info-value">{{ steps.length }}</span>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="content-card editor-card">
        <el-tabs v-model="activeTab" class="editor-tabs">

          <el-tab-pane label="基本信息" name="basic">
            <div class="tab-content">
              <el-form :model="editForm" label-position="top" style="max-width: 600px" @change="markChanged">
                <el-form-item label="模板名称" required>
                  <el-input v-model="editForm.name" placeholder="输入模板名称" :disabled="!canEdit" />
                </el-form-item>
                <el-form-item label="分类">
                  <el-input v-model="editForm.category" placeholder="如：合同、人事、财务" :disabled="!canEdit" />
                </el-form-item>
                <el-form-item label="描述">
                  <el-input v-model="editForm.description" type="textarea" :rows="3" :disabled="!canEdit" />
                </el-form-item>
              </el-form>
              <div v-if="!canEdit" class="edit-hint">
                <el-alert type="warning" :closable="false" show-icon>
                  <template #title>
                    模板已发布，点击"取消发布"可恢复为草稿状态进行编辑
                  </template>
                </el-alert>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="字段配置" name="fields" :disabled="!canEdit" lazy>
            <div class="tab-content">
              <div class="field-table-toolbar">
                <span class="field-count">共 {{ fields.length }} 个字段</span>
                <div class="field-toolbar-actions">
                  <el-button size="small" :icon="'Download'" @click="handleExportFields">
                    导出字段
                  </el-button>
                  <el-button size="small" type="primary" plain :icon="'Upload'" @click="handleImportFields">
                    导入字段
                  </el-button>
                </div>
              </div>
              <div class="field-editor-wrapper">
                <PDFFieldEditor
                  :pdf-url="pdfUrl"
                  :fields="fields"
                  embedded
                  @update:fields="onFieldChange"
                />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="步骤配置" name="steps" :disabled="!canEdit" lazy>
            <div class="tab-content" v-if="activeTab === 'steps'">
              <div class="steps-header">
                <span class="steps-title">共 {{ steps.length }} 个步骤</span>
                <el-button size="small" type="primary" @click="addStep" :icon="'Plus'">添加步骤</el-button>
              </div>
              <div class="steps-list">
                <el-card
                  v-for="(step, si) in steps"
                  :key="si"
                  shadow="never"
                  class="step-card"
                >
                  <template #header>
                    <div class="step-card-header">
                      <div class="step-header-left">
                        <el-tag size="small" type="primary" round>步骤 {{ step.order }}</el-tag>
                        <el-input
                          v-model="step.label"
                          size="small"
                          style="width: 200px"
                          placeholder="步骤名称"
                          @change="markChanged"
                        />
                      </div>
                      <div class="step-header-actions">
                        <el-button
                          size="small"
                          text
                          :disabled="si === 0"
                          @click="moveStep(si, -1)"
                          :icon="'ArrowUp'"
                        />
                        <el-button
                          size="small"
                          text
                          :disabled="si === steps.length - 1"
                          @click="moveStep(si, 1)"
                          :icon="'ArrowDown'"
                        />
                        <el-button
                          size="small"
                          type="danger"
                          text
                          @click="removeStep(si)"
                          :icon="'Delete'"
                        />
                      </div>
                    </div>
                  </template>
                  <el-form :model="step" label-position="top" size="small">
                    <el-row :gutter="16">
                      <el-col :span="8">
                        <el-form-item label="指派方式">
                          <el-radio-group v-model="step.assigneeType" @change="markChanged">
                            <el-radio value="fixed">设计期指派</el-radio>
                            <el-radio value="handoff">由上一步指定</el-radio>
                          </el-radio-group>
                        </el-form-item>
                      </el-col>
                    </el-row>

                    <template v-if="step.assigneeType === 'fixed'">
                      <el-form-item label="负责人目标">
                        <el-radio-group v-model="step.assigneeTargetType" size="small" @change="onAssigneeTargetTypeChange(step)">
                          <el-radio-button value="user">具体用户</el-radio-button>
                          <el-radio-button value="dept">部门</el-radio-button>
                          <el-radio-button value="org">整个机构</el-radio-button>
                        </el-radio-group>
                      </el-form-item>
                      <el-form-item v-if="step.assigneeTargetType === 'user'" label="选择用户">
                        <DeptTreePicker
                          mode="user"
                          :model-value="getTargetIds(step, 'user')"
                          @update:model-value="(ids: any) => setTargetIds(step, 'user', ids)"
                          multiple
                        />
                      </el-form-item>
                      <el-form-item v-else-if="step.assigneeTargetType === 'dept'" label="选择部门">
                        <DeptTreePicker
                          mode="dept"
                          :model-value="getTargetIds(step, 'dept')"
                          @update:model-value="(id: any) => setTargetIds(step, 'dept', id)"
                        />
                      </el-form-item>
                      <el-form-item v-else-if="step.assigneeTargetType === 'org'">
                        <el-alert type="info" :closable="false" show-icon>
                          <template #title>整个机构（租户内全部 active 用户）</template>
                        </el-alert>
                      </el-form-item>
                    </template>
                    <el-form-item label="可编辑字段（勾选后本步骤可填写/签署）">
                      <div class="field-blocks">
                        <template v-for="block in stepFieldBlocks" :key="block.key">

                          <div class="field-block" v-if="block.type !== 'free'">
                            <div class="block-header">
                              <span class="block-header-checkbox" @click="toggleBlock(block, step)">
                                <el-icon v-if="isBlockChecked(block, step.fieldKeys)" :size="16" color="#409eff"><Select /></el-icon>
                                <el-icon v-else-if="isBlockIndeterminate(block, step.fieldKeys)" :size="16" color="#409eff"><Minus /></el-icon>
                                <span class="checkbox-blank"></span>
                              </span>
                              <span class="block-label">{{ block.label }}</span>
                              <el-tag size="small" :color="block.type === 'container' ? '#13c2c2' : '#fa8c16'" effect="dark" class="block-tag">
                                {{ block.type === 'container' ? '行容器' : '分组' }}
                              </el-tag>
                            </div>

                            <div v-for="child in block.children" :key="child.key" class="block-nested">
                              <div class="block-header">
                                <span class="block-header-checkbox" @click="toggleBlock(child, step)">
                                  <el-icon v-if="isBlockChecked(child, step.fieldKeys)" :size="16" color="#409eff"><Select /></el-icon>
                                  <el-icon v-else-if="isBlockIndeterminate(child, step.fieldKeys)" :size="16" color="#409eff"><Minus /></el-icon>
                                  <span class="checkbox-blank"></span>
                                </span>
                                <span class="block-label">{{ child.label }}</span>
                                <el-tag size="small" color="#fa8c16" effect="dark" class="block-tag">分组</el-tag>
                              </div>
                              <div class="field-tags">
                                <span
                                  v-for="f in child.fields"
                                  :key="f.key"
                                  class="field-tag-checkbox"
                                  :class="{
                                    checked: step.fieldKeys.includes(f.key),
                                    disabled: occupiedKeysForStep(step).has(f.key)
                                  }"
                                  @click="toggleField(f.key, step)"
                                >
                                  <span class="field-tag-box">
                                    <el-icon v-if="step.fieldKeys.includes(f.key)" :size="12" color="#409eff"><Check /></el-icon>
                                  </span>
                                  <span class="field-tag-text">{{ f.label || f.key }}</span>
                                  <el-tag size="small" type="info" effect="plain" class="field-type-tag">
                                    {{ getFieldTypeLabel(f.type) }}
                                  </el-tag>
                                </span>
                              </div>
                            </div>

                            <div class="field-tags" v-if="block.fields.length > 0">
                              <span
                                v-for="f in block.fields"
                                :key="f.key"
                                class="field-tag-checkbox"
                                :class="{
                                  checked: step.fieldKeys.includes(f.key),
                                  disabled: occupiedKeysForStep(step).has(f.key)
                                }"
                                @click="toggleField(f.key, step)"
                              >
                                <span class="field-tag-box">
                                  <el-icon v-if="step.fieldKeys.includes(f.key)" :size="12" color="#409eff"><Check /></el-icon>
                                </span>
                                <span class="field-tag-text">{{ f.label || f.key }}</span>
                                <el-tag size="small" type="info" effect="plain" class="field-type-tag">
                                  {{ getFieldTypeLabel(f.type) }}
                                </el-tag>
                              </span>
                            </div>
                          </div>

                          <div class="field-block free-block" v-if="block.type === 'free'">
                            <div class="field-tags">
                              <span
                                v-for="f in block.fields"
                                :key="f.key"
                                class="field-tag-checkbox"
                                :class="{
                                  checked: step.fieldKeys.includes(f.key),
                                  disabled: occupiedKeysForStep(step).has(f.key)
                                }"
                                @click="toggleField(f.key, step)"
                              >
                                <span class="field-tag-box">
                                  <el-icon v-if="step.fieldKeys.includes(f.key)" :size="12" color="#409eff"><Check /></el-icon>
                                </span>
                                <span class="field-tag-text">{{ f.label || f.key }}</span>
                                <el-tag size="small" type="info" effect="plain" class="field-type-tag">
                                  {{ getFieldTypeLabel(f.type) }}
                                </el-tag>
                              </span>
                            </div>
                          </div>
                        </template>
                      </div>
                      <div v-if="stepHasSignatureField(step)" class="sign-hint">
                        <el-tag size="small" type="warning" effect="light">该步骤包含签名字段，提交时将执行签署</el-tag>
                      </div>
                      <div v-if="fields.length === 0" class="no-fields-hint">
                        暂无字段，请先在「字段配置」中添加字段
                      </div>
                    </el-form-item>
                  </el-form>
                </el-card>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="PDF 预览" name="preview" lazy>
            <div class="tab-content" v-if="activeTab === 'preview'">
              <div v-if="pdfLoading" class="pdf-loading">
                <el-icon class="is-loading" style="font-size: 32px"><Loading /></el-icon>
                <span>加载 PDF 中...</span>
              </div>
              <div v-else-if="pdfUrl" class="pdf-preview-iframe">
                <iframe :src="pdfUrl" width="100%" height="100%" frameborder="0" />
              </div>
              <div v-else class="pdf-empty">
                <el-empty description="该模板没有关联的 PDF 文件" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.page-container {
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--srs-text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 0;
  color: var(--srs-text-tertiary);
}

.content-card {
  border-radius: var(--srs-radius-lg);
  border: 1px solid var(--srs-border);
  margin-bottom: 20px;
}

.info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 4px 0;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: var(--srs-text-tertiary);
}

.info-value {
  font-size: 14px;
  color: var(--srs-text-primary);
  font-weight: 500;
}

.editor-card {
  min-height: 400px;
}

.editor-tabs {
  margin: -8px 0;
}

.tab-content {
  padding: 8px 0;
  min-height: 300px;
}

.edit-hint {
  margin-top: 16px;
}

.field-editor-wrapper {
  height: calc(100vh - 320px);
  min-height: 500px;
  border: 1px solid var(--srs-border);
  border-radius: 8px;
  overflow: hidden;
}

.field-editor-placeholder {
  max-width: 900px;
}

.field-table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.field-count {
  font-size: 14px;
  color: var(--srs-text-secondary);
}

.field-toolbar-actions {
  display: flex;
  gap: 8px;
}

.steps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.steps-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-card {
  border-radius: 8px;
  border: 1px solid var(--srs-border);
}

.step-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-header-actions {
  display: flex;
  gap: 4px;
}

.no-fields-hint {
  font-size: 13px;
  color: var(--srs-text-tertiary);
  padding: 8px 0;
}

.field-blocks {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.field-block {
  border: 1px solid var(--srs-border);
  border-radius: 8px;
  padding: 12px;
  background: var(--srs-bg-hover);
}

.field-block.free-block {
  border-style: dashed;
  background: transparent;
}

.block-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--srs-border-light);
}

.block-header-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  border: 1px solid var(--srs-border-input);
  border-radius: 3px;
  background: var(--srs-bg-card);
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color var(--srs-transition-fast), background var(--srs-transition-fast);
}

.block-header-checkbox:hover {
  border-color: var(--srs-primary);
}

.checkbox-blank {
  display: block;
  width: 16px;
  height: 16px;
}

.block-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--srs-text-primary);
  margin-right: 6px;
}

.block-tag {
  margin-left: 2px;
}

.block-nested {
  margin-bottom: 8px;
  padding: 8px 8px 4px 12px;
  background: var(--srs-bg-card);
  border-radius: 6px;
  border: 1px solid var(--srs-border-light);
}

.block-nested .block-header {
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom-color: var(--srs-border-light);
}

.field-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-tag-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--srs-border);
  border-radius: 6px;
  background: var(--srs-bg-card);
  cursor: pointer;
  user-select: none;
  transition: border-color var(--srs-transition-fast), background var(--srs-transition-fast);
}

.field-tag-checkbox:hover {
  border-color: var(--srs-primary);
  background: var(--srs-primary-bg);
}

.field-tag-checkbox.checked {
  border-color: var(--srs-primary);
  background: var(--srs-primary-bg);
}

.field-tag-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid var(--srs-border-input);
  border-radius: 3px;
  background: var(--srs-bg-card);
  flex-shrink: 0;
}

.field-tag-checkbox.checked .field-tag-box {
  border-color: var(--srs-primary);
  background: var(--srs-primary);
}

.field-tag-text {
  font-size: 13px;
  color: var(--srs-text-secondary);
}

.field-type-tag {
  margin-left: 2px;
}

.sign-hint {
  margin-top: 8px;
}

.pdf-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 0;
  color: var(--srs-text-tertiary);
}

.pdf-preview-iframe {
  height: calc(100vh - 320px);
  min-height: 500px;
}

.pdf-empty {
  padding: 60px 0;
}

.field-tag-checkbox.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: var(--srs-bg-hover);
  border-color: var(--srs-border-light);
}
.field-tag-checkbox.disabled:hover {
  border-color: var(--srs-border-light);
  background: var(--srs-bg-hover);
}
.field-tag-checkbox.disabled .field-tag-text {
  color: var(--srs-text-tertiary);
}
.field-tag-checkbox.disabled .field-type-tag {
  opacity: 0.5;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
  }
  .info-bar {
    gap: 12px;
  }
}
</style>