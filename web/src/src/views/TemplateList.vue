<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { templateAPI, documentAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile } from 'element-plus'
import PDFFieldEditor from '@/components/PDFFieldEditor.vue'
import DeptTreePicker from '@/components/DeptTreePicker.vue'
import { buildStepFieldBlocks, collectBlockFieldKeys } from '@/composables/useStepFieldTree'

const router = useRouter()
const userStore = useUserStore()
const permStore = usePermissionStore()

const templates = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const status = ref('')
const loading = ref(false)

const creatorNames = ref<Record<string, string>>({})

const dialogVisible = ref(false)
const form = ref({
  name: '',
  category: '',
  description: '',
})
const saveLoading = ref(false)

const file = ref<File | null>(null)
const analyzing = ref(false)
const fields = ref<any[]>([])
const steps = ref<any[]>([
  { order: 1, label: '步骤1', assigneeType: 'fixed', assigneeTargets: [], assigneeTargetType: 'user', fieldKeys: [] as string[] },
])
const pdfFileUrl = ref<string>('')

type UploadStep = 'upload' | 'fields' | 'steps' | 'confirm'
const uploadStep = ref<UploadStep>('upload')

async function loadList() {
  loading.value = true
  try {
    const res: any = await templateAPI.list({
      keyword: keyword.value || undefined,
      status: status.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    templates.value = res.data?.list || []
    total.value = res.data?.total || 0
    creatorNames.value = res.data?.creatorNames || {}
  } catch {
  } finally {
    loading.value = false
  }
}

onMounted(loadList)

function handleSearch() {
  page.value = 1
  loadList()
}

function canInitiate(tpl: any): boolean {
  if (tpl.status !== 'published') return false
  const scope = tpl.initiateScope
  if (!scope || scope.length === 0) return true
  for (const target of scope) {
    if (target.type === 'org') return true
    if (target.type === 'user' && target.id === userStore.userId) return true
  }
  return false
}

function handlePageChange(p: number) {
  page.value = p
  loadList()
}

function handleUpload() {
  form.value = { name: '', category: '', description: '' }
  file.value = null
  fields.value = []
  steps.value = [
    { order: 1, label: '步骤1', assigneeType: 'fixed', assigneeTargets: [], assigneeTargetType: 'user', fieldKeys: [] as string[] },
  ]
  uploadStep.value = 'upload'
  dialogVisible.value = true
}

function handleFileChange(uploadFile: UploadFile) {
  if (uploadFile.raw) {
    file.value = uploadFile.raw
    const fileName = uploadFile.name
    if (fileName.toLowerCase().endsWith('.pdf')) {
      if (!form.value.name) {
        form.value.name = fileName.replace(/\.pdf$/i, '')
      }
    }
  }
}

function handleFileRemove() {
  file.value = null
  fields.value = []
  uploadStep.value = 'upload'
}

async function handleAnalyze() {
  if (!file.value) {
    ElMessage.warning('请先上传 PDF 文件')
    return
  }
  analyzing.value = true
  try {
    const res: any = await templateAPI.analyzePDF(file.value)
    if (pdfFileUrl.value) URL.revokeObjectURL(pdfFileUrl.value)
    pdfFileUrl.value = URL.createObjectURL(file.value)

    if (res.data?.hasAcroForm && res.data?.fields?.length > 0) {
      fields.value = res.data.fields.map((f: any, i: number) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        readOnly: f.readOnly,
        isKey: f.isKey || false,
        regex: f.regex || '',
        minVal: f.minVal ?? null,
        maxVal: f.maxVal ?? null,
        options: f.options || [],
        groupKey: f.groupKey || '',
        signType: f.signType || (f.type === 'signature' ? 'handwriting' : ''),
        containerKey: f.containerKey || '',
        containerRect: f.containerRect || [0, 0, 0, 0],
        isContainer: f.isContainer || false,
        pageIndex: f.pageIndex,
        rect: f.rect,
        order: i + 1,
      }))
      steps.value[0].fieldKeys = fields.value.map((f: any) => f.key)
      ElMessage.success(`检测到 ${fields.value.length} 个表单字段`)
    } else {
      if (res.data?.hasAcroForm) {
        ElMessage.info('PDF 包含 AcroForm，但未检测到可识别字段')
      } else {
        ElMessage.info('PDF 不包含 AcroForm，可在 PDF 上拖拽添加字段')
      }
      fields.value = []
      steps.value[0].fieldKeys = []
    }
    uploadStep.value = 'fields'
  } catch (e: any) {
    ElMessage.error(e?.message || '分析 PDF 失败')
  } finally {
    analyzing.value = false
  }
}

function proceedToSteps() {
  for (const f of fields.value) {
    if (!f.key) {
      ElMessage.warning('字段标识不能为空')
      return
    }
    if (!f.label) {
      f.label = f.key
    }
  }
  if (steps.value.length === 1 && steps.value[0].fieldKeys.length === 0) {
    steps.value[0].fieldKeys = fields.value.map((f: any) => f.key)
  }
  uploadStep.value = 'steps'
}

function proceedToConfirm() {
  uploadStep.value = 'confirm'
}

function goBackToUpload() {
  uploadStep.value = 'upload'
}

function goBackToFields() {
  uploadStep.value = 'fields'
}

const stepFieldBlocks = computed(() => buildStepFieldBlocks(fields.value))

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
  const allChecked = keys.every((k: string) => step.fieldKeys.includes(k))
  if (allChecked) {
    step.fieldKeys = step.fieldKeys.filter((k: string) => !keys.includes(k))
  } else {
    step.fieldKeys = [...new Set([...step.fieldKeys, ...keys])]
  }
}

function toggleField(fieldKey: string, step: any) {
  if (step.fieldKeys.includes(fieldKey)) {
    step.fieldKeys = step.fieldKeys.filter((k: string) => k !== fieldKey)
  } else {
    step.fieldKeys = [...step.fieldKeys, fieldKey]
  }
}

function addStep() {
  const maxOrder = steps.value.reduce((max: number, s: any) => Math.max(max, s.order || 0), 0)
  steps.value.push({
    order: maxOrder + 1,
    label: `步骤${maxOrder + 1}`,
    assigneeType: 'fixed',
    assigneeTargets: [],
    assigneeTargetType: 'user',
    fieldKeys: [],
    hiddenFields: [],
  })
}

function onAssigneeTargetTypeChange(step: any) {
  if (!step.assigneeTargets) step.assigneeTargets = []
  if (step.assigneeTargetType === 'org') {
    step.assigneeTargets = [{ type: 'org', id: '' }]
  }
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
  step.assigneeTargets = type === 'user'
    ? [...others, ...list.map((id: string) => ({ type, id }))]
    : [...others, ...list.slice(0, 1).map((id: string) => ({ type, id }))]
}

function removeStep(index: number) {
  if (steps.value.length <= 1) {
    ElMessage.warning('至少保留一个步骤')
    return
  }
  steps.value.splice(index, 1)
  steps.value.forEach((s: any, i: number) => { s.order = i + 1 })
}

function moveStep(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= steps.value.length) return
  const temp = steps.value[index]
  steps.value[index] = steps.value[target]
  steps.value[target] = temp
  steps.value.forEach((s: any, i: number) => { s.order = i + 1 })
}

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

async function handleUploadSave() {
  if (!form.value.name) {
    ElMessage.warning('请输入模板名称')
    return
  }
  if (!file.value) {
    ElMessage.warning('请上传 PDF 文件')
    return
  }
  saveLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file.value)
    formData.append('name', form.value.name)
    formData.append('category', form.value.category)
    formData.append('description', form.value.description)
    formData.append('fields', JSON.stringify(fields.value))
    const cleanSteps = steps.value.map((s: any) => ({
      order: s.order,
      label: s.label,
      assigneeType: s.assigneeType || 'fixed',
      assigneeTargets: s.assigneeTargets || [],
      assigneeIds: (s.assigneeTargets || [])
        .filter((t: any) => t.type === 'user').map((t: any) => t.id),
      fieldKeys: s.fieldKeys || [],
      hiddenFields: s.hiddenFields || [],
    }))
    formData.append('steps', JSON.stringify(cleanSteps))

    await templateAPI.uploadPDF(formData)
    ElMessage.success('模板创建成功')
    dialogVisible.value = false
    loadList()
  } catch (e: any) {
    ElMessage.error(e?.message || '创建模板失败')
  } finally {
    saveLoading.value = false
  }
}

async function handleInitiate(tplId: string) {
  try {
    const tplRes: any = await templateAPI.getDetail(tplId)
    const template = tplRes.data

    if (template.status !== 'published') {
      ElMessage.warning('只能基于已发布的模板发起流程')
      return
    }

    const { value: title } = await ElMessageBox.prompt('请输入文档标题', '发起流程', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '文档标题',
      inputValue: template.name,
    })

    if (!title) {
      ElMessage.warning('请输入文档标题')
      return
    }

    const res: any = await documentAPI.initiate({
      templateId: tplId,
      title: title,
    })

    ElMessage.success('文档创建成功')

    router.push(`/documents/${res.data.id}/fill`)
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '发起流程失败')
    }
  }
}

function handleEdit(tplId: string) {
  router.push({ path: `/templates/${tplId}` })
}

const publishDialogVisible = ref(false)
const publishTarget = ref('')
const publishScopeType = ref<'org' | 'dept' | 'user'>('org')
const publishScopeUserIds = ref<string[]>([])
const publishScopeDeptId = ref('')

function handlePublish(tplId: string) {
  publishTarget.value = tplId
  publishScopeType.value = 'org'
  publishScopeUserIds.value = []
  publishScopeDeptId.value = ''
  publishDialogVisible.value = true
}

async function confirmPublish() {
  if (!publishTarget.value) return
  const initiateScope: any[] = []
  if (publishScopeType.value === 'org') {
    initiateScope.push({ type: 'org', id: '' })
  } else if (publishScopeType.value === 'dept') {
    if (!publishScopeDeptId.value) {
      ElMessage.warning('请选择部门')
      return
    }
    initiateScope.push({ type: 'dept', id: publishScopeDeptId.value })
  } else if (publishScopeType.value === 'user') {
    if (publishScopeUserIds.value.length === 0) {
      ElMessage.warning('请选择至少一个用户')
      return
    }
    for (const uid of publishScopeUserIds.value) {
      initiateScope.push({ type: 'user', id: uid })
    }
  }
  try {
    await templateAPI.publish(publishTarget.value, initiateScope)
    ElMessage.success('发布成功')
    publishDialogVisible.value = false
    loadList()
  } catch (e: any) {
    ElMessage.error(e?.message || '发布失败')
  }
}

async function handleUnpublish(tplId: string) {
  try {
    await ElMessageBox.confirm('取消发布后模板将恢复为草稿状态，可重新编辑。确定取消发布？', '确认取消发布', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    await templateAPI.unpublish(tplId)
    ElMessage.success('已取消发布')
    loadList()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '操作失败')
    }
  }
}

async function handleDelete(tplId: string) {
  try {
    await ElMessageBox.confirm('删除后不可恢复，确定删除？', '确认删除', {
      type: 'error',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await templateAPI.delete(tplId)
    ElMessage.success('删除成功')
    loadList()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '删除失败')
    }
  }
}

</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">模板库</h2>
      <div class="header-actions">
        <el-button @click="handleUpload" type="primary" v-if="permStore.hasPermission('template:create')">
          <el-icon style="margin-right: 6px"><Upload /></el-icon>
          上传 PDF 创建模板
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="content-card">
      <div class="toolbar">
        <el-form :inline="true" @keyup.enter="handleSearch">
          <el-form-item>
            <el-input v-model="keyword" placeholder="搜索模板名称/分类" clearable style="width: 240px" @clear="handleSearch" />
          </el-form-item>
          <el-form-item>
            <el-select v-model="status" placeholder="状态" clearable style="width: 120px" @change="handleSearch">
              <el-option label="草稿" value="draft" />
              <el-option label="已发布" value="published" />
              <el-option label="已停用" value="disabled" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="templates" stripe style="width: 100%" v-loading="loading" empty-text="暂无模板">
        <el-table-column prop="name" label="模板名称" min-width="200">
          <template #default="{ row }">
            <div class="tpl-name-cell">
              <span class="tpl-name">{{ row.name }}</span>
              <el-tag v-if="row.pdfBytes" size="small" type="info" effect="plain" style="margin-left: 8px">PDF</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.category || '未分类' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建者" width="120">
          <template #default="{ row }">
            <span v-if="row.createdBy === userStore.userId" style="color: #409eff">我</span>
            <span v-else style="color: #64748b">{{ creatorNames[row.createdBy] || row.createdBy?.slice(0, 8) || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'published' ? 'success' : row.status === 'disabled' ? 'danger' : 'info'"
              size="small"
              effect="plain"
            >
              {{ row.status === 'published' ? '已发布' : row.status === 'disabled' ? '已停用' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button v-if="permStore.hasPermission('template:update')" link type="primary" size="small" @click="handleEdit(row.id)">编辑</el-button>
            <el-button v-if="canInitiate(row)" link type="primary" size="small" @click="handleInitiate(row.id)">发起</el-button>
            <el-button v-if="row.status === 'draft' && permStore.hasPermission('template:publish')" link type="success" size="small" @click="handlePublish(row.id)">发布</el-button>
            <el-button v-if="row.status === 'published' && permStore.hasPermission('template:unpublish')" link type="warning" size="small" @click="handleUnpublish(row.id)">下架</el-button>
            <el-button v-if="row.status === 'draft' && permStore.hasPermission('template:delete')" link type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper" v-if="total > 0">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          background
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      title="上传 PDF 创建模板"
      :width="uploadStep === 'fields' || uploadStep === 'steps' ? '90%' : '520px'"
      :close-on-click-modal="false"
      destroy-on-close
      :fullscreen="uploadStep === 'fields'"
    >

      <div v-if="uploadStep === 'upload'">
        <el-form :model="form" label-position="top">
          <el-form-item label="模板名称" required>
            <el-input v-model="form.name" placeholder="默认使用文件名" />
          </el-form-item>
          <el-form-item label="分类">
            <el-input v-model="form.category" placeholder="如：合同、人事、财务" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="form.description" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="上传 PDF 文件" required>
            <el-upload
              drag
              accept=".pdf"
              :auto-upload="false"
              :show-file-list="true"
              :limit="1"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
            >
              <el-icon class="el-icon--upload" style="font-size: 48px"><UploadFilled /></el-icon>
              <div class="el-upload__text">拖拽 PDF 文件到此处，或 <em>点击选择</em></div>
              <div class="el-upload__tip" slot="tip">仅支持 PDF 格式，文件大小不超过 50MB</div>
            </el-upload>
          </el-form-item>
        </el-form>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="analyzing" @click="handleAnalyze" :disabled="!file">
            {{ analyzing ? '正在分析...' : '上传并分析' }}
          </el-button>
        </div>
      </div>

      <div v-if="uploadStep === 'fields'" class="editor-fullscreen">
        <PDFFieldEditor
          v-if="pdfFileUrl"
          :pdf-url="pdfFileUrl"
          v-model:fields="fields"
          @back="goBackToUpload"
          @next="proceedToSteps"
        />
      </div>

      <div v-if="uploadStep === 'steps'">
        <div class="steps-header-bar">
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
                    <el-radio-group v-model="step.assigneeType" @change="onAssigneeTargetTypeChange(step)">
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
                            :class="{ checked: step.fieldKeys.includes(f.key) }"
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
                          :class="{ checked: step.fieldKeys.includes(f.key) }"
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
                          :class="{ checked: step.fieldKeys.includes(f.key) }"
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
        <div class="dialog-footer">
          <el-button @click="goBackToFields">上一步</el-button>
          <el-button type="primary" @click="proceedToConfirm">下一步：确认</el-button>
        </div>
      </div>

      <div v-if="uploadStep === 'confirm'">
        <div class="confirm-content">
          <el-descriptions :column="1" direction="vertical" border size="small">
            <el-descriptions-item label="模板名称">{{ form.name }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ form.category || '未分类' }}</el-descriptions-item>
            <el-descriptions-item label="描述">{{ form.description || '无' }}</el-descriptions-item>
            <el-descriptions-item label="检测字段">
              <el-tag size="small" type="success">{{ fields.length }} 个字段</el-tag>
              <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px;">
                <el-tag v-for="f in fields" :key="f.key" size="small" effect="plain">
                  {{ f.label || f.key }} ({{ f.type }})
                </el-tag>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="步骤">
              <el-tag size="small" type="primary">{{ steps.length }} 个步骤</el-tag>
              <div style="margin-top: 6px;">
                <div v-for="(s, i) in steps" :key="i" style="margin-bottom: 4px; font-size: 13px; color: #475569;">
                  {{ s.label }} — {{ stepHasSignatureField(s) ? '需签名' : '不签名' }} — {{ s.fieldKeys.length }} 个字段
                </div>
              </div>
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="dialog-footer">
          <el-button @click="goBackToFields">上一步</el-button>
          <el-button type="primary" :loading="saveLoading" @click="handleUploadSave">确认创建</el-button>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="publishDialogVisible" title="发布模板" width="520px" :close-on-click-modal="false">
      <p style="margin-bottom: 16px; color: #64748b; font-size: 14px;">
        选择允许发起该模板流程的人员范围。留空（整个机构）表示租户内所有用户均可发起。
      </p>
      <el-form label-position="top">
        <el-form-item label="发起范围">
          <el-radio-group v-model="publishScopeType">
            <el-radio-button value="org">整个机构</el-radio-button>
            <el-radio-button value="dept">指定部门</el-radio-button>
            <el-radio-button value="user">指定用户</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="publishScopeType === 'dept'" label="选择部门">
          <DeptTreePicker
            mode="dept"
            :model-value="publishScopeDeptId"
            @update:model-value="(id: any) => publishScopeDeptId = id"
          />
        </el-form-item>
        <el-form-item v-if="publishScopeType === 'user'" label="选择用户">
          <DeptTreePicker
            mode="user"
            :model-value="publishScopeUserIds"
            @update:model-value="(ids: any) => publishScopeUserIds = ids"
            multiple
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPublish">确认发布</el-button>
      </template>
    </el-dialog>
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
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--srs-text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.content-card {
  border-radius: var(--srs-radius-lg);
  border: 1px solid var(--srs-border);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.tpl-name-cell {
  display: flex;
  align-items: center;
}

.tpl-name {
  font-weight: 500;
  color: var(--srs-text-primary);
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--srs-border-light);
}

.step-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
}

.steps-header-bar {
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
  margin-bottom: 16px;
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

.confirm-content {
  margin-bottom: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--srs-border-light);
}

.editor-fullscreen {
  height: calc(100vh - 110px);
  display: flex;
  flex-direction: column;
  margin: -32px -20px;
}
</style>