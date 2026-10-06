<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { documentAPI } from '@/api'
import { ElMessage } from 'element-plus'
import { User, CaretRight } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import DeptTreePicker from '@/components/DeptTreePicker.vue'
import FillFieldControl from '@/components/FillFieldControl.vue'
import { useFieldHistory } from '@/composables/useFieldHistory'
import { buildStepFieldBlocks, isImageFieldType, isImageValue, isBlockCollapsible } from '@/utils/fieldBlocks'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const docId = route.params.id as string
const hist = useFieldHistory(docId)

const doc = ref<any>({})
const currentStep = ref(1)
const totalSteps = ref(1)
const fieldValues = ref<Record<string, any>>({})
const loading = ref(false)
const pageLoading = ref(true)
const signLoading = ref(false)
const signPasswordDialog = ref(false)
const signPassword = ref('')

const nextAssigneeDialog = ref(false)
const nextAssigneeId = ref<string | null>(null)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
const signatureDataUrl = ref<string | null>(null)
const saveSignature = ref(false)

const collapsedKeys = ref<Set<string>>(new Set())

function blockCount(block: any): number {
  let n = block.fields.length
  for (const c of block.children || []) n += blockCount(c)
  return n
}

function isCollapsed(key: string) {
  return collapsedKeys.value.has(key)
}

function toggleCollapse(key: string) {
  const next = new Set(collapsedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedKeys.value = next
}

function blockTypeClass(type: string) {
  return type === 'container' ? 'is-container' : type === 'group' ? 'is-group' : 'is-free'
}

watch(signPasswordDialog, (visible) => {
  if (visible) {
    signatureDataUrl.value = null
    saveSignature.value = false
    requestAnimationFrame(() => clearCanvas())
  }
})

const currentStepSnap = computed(() => {
  const snap = doc.value.snapshot
  if (!snap?.steps) return null
  return snap.steps.find((s: any) => s.order === currentStep.value)
})

const fieldPermissions = computed<Record<string, number>>(() => {
  const perms = doc.value.fieldPermissions
  if (perms && typeof perms === 'object') return perms
  const snap = doc.value.snapshot
  if (!snap?.steps || !snap?.fields) return {}
  const out: Record<string, number> = {}
  const step = snap.steps.find((s: any) => s.order === currentStep.value)
  const hidden = step?.hiddenFields || []
  for (const f of snap.fields) {
    const stepIdx = snap.steps.findIndex((s: any) => (s.fieldKeys || []).includes(f.key))
    if (stepIdx < 0) { out[f.key] = 1; continue }
    const fieldStep = snap.steps[stepIdx].order
    if (fieldStep > currentStep.value) out[f.key] = 0
    else if (fieldStep < currentStep.value) out[f.key] = hidden.includes(f.key) ? 0 : 1
    else out[f.key] = 2
  }
  return out
})

const currentFields = computed(() => {
  return allFields.value.filter((f: any) => (fieldPermissions.value[f.key] ?? 0) === 2)
})

const editableBlocks = computed(() =>
  buildStepFieldBlocks(allFields.value.filter((f: any) =>
    (f.type === 'container' || f.type === 'group') || (fieldPermissions.value[f.key] ?? 0) === 2
  )),
)
const readOnlyBlocks = computed(() =>
  buildStepFieldBlocks(allFields.value.filter((f: any) =>
    (f.type === 'container' || f.type === 'group') || (fieldPermissions.value[f.key] ?? 0) === 1
  )),
)

const allFields = computed(() => {
  const snap = doc.value.snapshot
  if (!snap?.fields) return []
  return [...snap.fields].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
})

const nextStepIsHandoff = computed(() => {
  const snap = doc.value.snapshot
  if (!snap?.steps) return false
  const next = snap.steps.find((s: any) => s.order === currentStep.value + 1)
  return next?.assigneeType === 'handoff'
})

const needSign = computed(() => {
  try {
    const snapshot = doc.value.snapshot
    if (!snapshot) return false
    const step = snapshot.steps?.find((s: any) => s.order === currentStep.value)
    if (!step) return false
    const keys = step.fieldKeys || []
    return snapshot.fields?.some((f: any) => keys.includes(f.key) && f.type === 'signature') || false
  } catch {
    return false
  }
})

const formRules = computed(() => {
  const rules: Record<string, any[]> = {}
  for (const field of currentFields.value) {
    const fieldRules: any[] = []
    if (field.required) {
      fieldRules.push({ required: true, message: '请填写' + field.label, trigger: 'blur' })
    }
    if (field.regex) {
      fieldRules.push({
        pattern: new RegExp(field.regex),
        message: field.label + '格式不正确',
        trigger: 'blur',
      })
    }
    if (field.type === 'number' && (field.minVal !== undefined || field.maxVal !== undefined)) {
      if (field.minVal !== undefined && field.minVal !== null) {
        fieldRules.push({
          validator: (_: any, value: any, callback: any) => {
            if (value !== undefined && value !== null && value !== '' && Number(value) < field.minVal) {
              callback(new Error(`${field.label}不能小于${field.minVal}`))
            } else {
              callback()
            }
          },
          trigger: 'blur',
        })
      }
      if (field.maxVal !== undefined && field.maxVal !== null) {
        fieldRules.push({
          validator: (_: any, value: any, callback: any) => {
            if (value !== undefined && value !== null && value !== '' && Number(value) > field.maxVal) {
              callback(new Error(`${field.label}不能大于${field.maxVal}`))
            } else {
              callback()
            }
          },
          trigger: 'blur',
        })
      }
    }
    rules[field.key] = fieldRules
  }
  return rules
})

const stepProgress = computed(() => {
  const snap = doc.value.snapshot
  const steps = snap?.steps || []
  const infos = doc.value.stepInfos || []
  return steps.map((s: any) => {
    const inst = (doc.value.stepInstances || []).find((i: any) => i.stepOrder === s.order)
    const info = infos.find((i: any) => i.stepOrder === s.order)
    return {
      order: s.order,
      label: s.label || `步骤 ${s.order}`,
      status: inst?.status || 'pending',
      assigneeText: info?.assigneeNames?.length
        ? info.assigneeNames.join('、')
        : (info?.targetDesc || ''),
    }
  })
})

function stepStatusMap(s: string) {
  const m: Record<string, string> = {
    pending: 'wait',
    in_progress: 'process',
    completed: 'success',
    returned: 'warning',
  }
  return m[s] || 'wait'
}

function stepStatusLabel(s: string) {
  const m: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    returned: '已退回',
  }
  return m[s] || s
}

onMounted(async () => {
  try {
    const res: any = await documentAPI.getDetail(docId)
    const data = res.data || res
    doc.value = data
    currentStep.value = data.currentStep || 1
    const snap = data.snapshot
    totalSteps.value = snap?.steps?.length || 1
    const fv: Record<string, any> = {}
    for (const item of (data.fieldValues || [])) {
      fv[item.fieldKey] = item.value
    }
    fieldValues.value = fv
  } catch {
  } finally {
    pageLoading.value = false
  }
})

async function handleSubmit() {
  if (needSign.value) {
    signPasswordDialog.value = true
  } else {
    if (nextStepIsHandoff.value) {
      nextAssigneeDialog.value = true
    } else {
      await submitStep(false)
    }
  }
}

async function submitStep(shouldSign: boolean) {
  loading.value = true
  try {
    const currentStepFields = currentFields.value
    const editableFieldValues: Record<string, any> = {}
    for (const f of currentStepFields) {
      if (fieldValues.value[f.key] !== undefined) {
        editableFieldValues[f.key] = fieldValues.value[f.key]
      }
    }
    const data: any = {
      fieldValues: editableFieldValues,
      shouldSign: shouldSign,
    }
    if (shouldSign && signPassword.value) {
      data.signPassword = signPassword.value
    }
    if (signatureDataUrl.value) {
      data.handwrittenSignature = signatureDataUrl.value
      data.saveSignature = saveSignature.value
    }
    if (nextStepIsHandoff.value && nextAssigneeId.value) {
      data.nextAssigneeId = nextAssigneeId.value
    }
    await documentAPI.submitStep(docId, currentStep.value, data)
    if (saveSignature.value && signatureDataUrl.value) {
      userStore.hasSignatureImage = true
      localStorage.setItem('hasSignatureImage', 'true')
    }
    ElMessage.success(shouldSign ? '签署并提交成功' : '步骤提交成功')
    router.push('/documents')
  } catch (e: any) {
    ElMessage.error(e.message || '提交失败')
  } finally {
    loading.value = false
  }
}

async function handleSign() {
  if (!signPassword.value) {
    ElMessage.warning('请输入签名密码')
    return
  }
  const sigFields = currentFields.value.filter((f: any) => f.type === 'signature')
  if (sigFields.length === 0) {
    ElMessage.warning('当前步骤没有签名字段')
    return
  }
  if (!userStore.hasSignatureImage) {
    const dataUrl = getSignatureDataUrl()
    if (!dataUrl) {
      ElMessage.warning('请手写签名或先上传签名')
      return
    }
    signatureDataUrl.value = dataUrl
    for (const f of sigFields) {
      fieldValues.value[f.key] = dataUrl
    }
  } else {
    for (const f of sigFields) {
      if (!fieldValues.value[f.key]) {
        fieldValues.value[f.key] = ''
      }
    }
  }
  signLoading.value = true
  try {
    if (nextStepIsHandoff.value) {
      nextAssigneeDialog.value = true
      signLoading.value = false
      return
    }
    await submitStep(true)
    signPasswordDialog.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '签署失败')
  } finally {
    signLoading.value = false
  }
}

function confirmNextAssignee() {
  if (!nextAssigneeId.value) {
    ElMessage.warning('请选择下一步的填写人')
    return
  }
  nextAssigneeDialog.value = false
  signPasswordDialog.value = false
  submitStep(needSign.value)
}

function goBack() {
  router.push('/documents')
}

function startDrawing(e: MouseEvent | TouchEvent) {
  isDrawing.value = true
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const rect = canvas.getBoundingClientRect()
  const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
  const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function draw(e: MouseEvent | TouchEvent) {
  if (!isDrawing.value) return
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const rect = canvas.getBoundingClientRect()
  const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
  const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#000'
  ctx.lineTo(x, y)
  ctx.stroke()
}

function stopDrawing() {
  isDrawing.value = false
}

function clearCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

function getSignatureDataUrl(): string | null {
  const canvas = canvasRef.value
  if (!canvas) return null
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] !== 0) {
      return canvas.toDataURL('image/png')
    }
  }
  return null
}

function formatDate(ms: number) {
  if (!ms) return '-'
  return new Date(ms).toLocaleString('zh-CN')
}
</script>

<template>
  <div class="fill-page">
    <div class="fill-header">
      <el-button @click="goBack" text bg icon="ArrowLeft">返回</el-button>
      <div class="fill-title">
        <span class="doc-title">{{ doc.title || '文档填写' }}</span>
        <span class="doc-number">{{ doc.docNumber }}</span>
      </div>
    </div>

    <el-row :gutter="24">

      <el-col :xs="24" :lg="16">
        <el-card shadow="never" class="fill-card" v-loading="pageLoading">
          <template #header>
            <div class="card-header">
              <span class="card-header-title">
                步骤 {{ currentStep }} — {{ currentStepSnap?.label || '填写信息' }}
              </span>
              <el-tag type="warning" effect="plain" size="small">进行中</el-tag>
            </div>
          </template>

          <template v-if="pageLoading">
            <el-skeleton :rows="6" animated />
          </template>

          <template v-else>

            <el-steps :active="currentStep - 1" align-center class="fill-steps" v-if="totalSteps > 1">
              <el-step
                v-for="s in stepProgress"
                :key="s.order"
                :title="s.label"
                :status="stepStatusMap(s.status) as any"
              />
            </el-steps>

            <div v-if="currentStepSnap?.description" class="step-guide">
              <el-alert
                :title="currentStepSnap.description"
                type="info"
                :closable="false"
                show-icon
              />
            </div>

            <el-card v-if="readOnlyBlocks.length > 0" shadow="never" class="readonly-card">
              <template #header>
                <span class="readonly-header">历史填写信息</span>
              </template>
              <div v-for="block in readOnlyBlocks" :key="block.key || block.label"
                :class="['doc-block', blockTypeClass(block.type)]">
                <div class="doc-block-header" :class="{ 'is-collapsible': isBlockCollapsible(block) }"
                  @click="isBlockCollapsible(block) && toggleCollapse('r:' + block.key)">
                  <el-icon v-if="isBlockCollapsible(block)"
                    :class="['block-arrow', { 'block-arrow--open': !isCollapsed('r:' + block.key) }]">
                    <CaretRight />
                  </el-icon>
                  <span class="doc-block-label">{{ block.label }}</span>
                  <el-tag v-if="block.type === 'container'" size="small" color="#13c2c2" effect="dark">行容器</el-tag>
                  <el-tag v-else-if="block.type === 'group'" size="small" color="#fa8c16" effect="dark">字段分组</el-tag>
                  <el-tag v-else size="small" type="info" effect="plain">独立字段</el-tag>
                  <span v-if="isCollapsed('r:' + block.key)" class="block-collapsed-hint">{{ blockCount(block) }} 项已折叠</span>
                </div>
                <div v-show="!isCollapsed('r:' + block.key)" class="doc-block-body">

                  <div v-for="f in block.fields" :key="f.key" class="readonly-field-row">
                    <span class="readonly-field-label">{{ f.label }}</span>
                    <span class="readonly-field-value">
                      <img
                        v-if="isImageFieldType(f.type) && isImageValue(fieldValues[f.key])"
                        :src="fieldValues[f.key]"
                        class="field-image"
                        alt=""
                      />
                      <img
                        v-else-if="f.type === 'signature' && fieldValues[f.key]"
                        :src="fieldValues[f.key]"
                        class="field-image"
                        alt=""
                      />
                      <span v-else>{{ fieldValues[f.key] ?? '-' }}</span>
                      <span v-if="f.type === 'signature' && fieldValues[f.key]" class="signed-badge">已签署</span>
                    </span>
                  </div>

                  <div v-for="child in block.children" :key="child.key"
                    :class="['doc-block', 'doc-block--nested', blockTypeClass(child.type)]">
                    <div class="doc-block-header" :class="{ 'is-collapsible': isBlockCollapsible(child) }"
                      @click="isBlockCollapsible(child) && toggleCollapse('r:' + child.key)">
                      <el-icon v-if="isBlockCollapsible(child)"
                        :class="['block-arrow', { 'block-arrow--open': !isCollapsed('r:' + child.key) }]">
                        <CaretRight />
                      </el-icon>
                      <span class="doc-block-label">{{ child.label }}</span>
                      <span v-if="isCollapsed('r:' + child.key)" class="block-collapsed-hint">{{ blockCount(child) }} 项已折叠</span>
                    </div>
                    <div v-show="!isCollapsed('r:' + child.key)" class="doc-block-body">
                      <div v-for="f in child.fields" :key="f.key" class="readonly-field-row">
                        <span class="readonly-field-label">{{ f.label }}</span>
                        <span class="readonly-field-value">
                          <img
                            v-if="isImageFieldType(f.type) && isImageValue(fieldValues[f.key])"
                            :src="fieldValues[f.key]"
                            class="field-image"
                            alt=""
                          />
                          <img
                            v-else-if="f.type === 'signature' && fieldValues[f.key]"
                            :src="fieldValues[f.key]"
                            class="field-image"
                            alt=""
                          />
                          <span v-else>{{ fieldValues[f.key] ?? '-' }}</span>
                          <span v-if="f.type === 'signature' && fieldValues[f.key]" class="signed-badge">已签署</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>

            <el-form
              ref="formRef"
              :model="fieldValues"
              :rules="formRules"
              label-position="right"
              class="fill-form"
              @submit.prevent
            >
              <template v-for="block in editableBlocks" :key="block.key || block.label">
                <div :class="['doc-block', blockTypeClass(block.type)]">

                  <div class="doc-block-header" :class="{ 'is-collapsible': isBlockCollapsible(block) }"
                    @click="isBlockCollapsible(block) && toggleCollapse('e:' + block.key)">
                    <el-icon v-if="isBlockCollapsible(block)"
                      :class="['block-arrow', { 'block-arrow--open': !isCollapsed('e:' + block.key) }]">
                      <CaretRight />
                    </el-icon>
                    <span class="doc-block-label">{{ block.label }}</span>
                    <el-tag v-if="block.type === 'container'" size="small" color="#13c2c2" effect="dark">行容器</el-tag>
                    <el-tag v-else-if="block.type === 'group'" size="small" color="#fa8c16" effect="dark">字段分组</el-tag>
                    <el-tag v-else size="small" type="info" effect="plain">独立字段</el-tag>
                    <span v-if="isCollapsed('e:' + block.key)" class="block-collapsed-hint">{{ blockCount(block) }} 项已折叠</span>
                  </div>

                  <div v-show="!isCollapsed('e:' + block.key)" class="doc-block-body">
                    <el-form-item
                      v-for="field in block.fields"
                      :key="field.key"
                      :label="field.label"
                      :required="field.required"
                      :prop="field.key"
                      class="fill-field-item"
                    >
                      <FillFieldControl
                        :field="field"
                        v-model="fieldValues[field.key]"
                        :candidates="hist.candidatesFor(field.key, fieldValues[field.key])"
                        :on-field-focus="() => hist.ensure(field.key)"
                      />
                    </el-form-item>

                    <div v-for="child in block.children" :key="child.key"
                      :class="['doc-block', 'doc-block--nested', blockTypeClass(child.type)]">
                      <div class="doc-block-header" :class="{ 'is-collapsible': isBlockCollapsible(child) }"
                        @click="isBlockCollapsible(child) && toggleCollapse('e:' + block.key + '/' + child.key)">
                        <el-icon v-if="isBlockCollapsible(child)"
                          :class="['block-arrow', { 'block-arrow--open': !isCollapsed('e:' + block.key + '/' + child.key) }]">
                          <CaretRight />
                        </el-icon>
                        <span class="doc-block-label">{{ child.label }}</span>
                        <span v-if="isCollapsed('e:' + block.key + '/' + child.key)" class="block-collapsed-hint">{{ blockCount(child) }} 项已折叠</span>
                      </div>
                      <div v-show="!isCollapsed('e:' + block.key + '/' + child.key)" class="doc-block-body">
                        <el-form-item
                          v-for="field in child.fields"
                          :key="field.key"
                          :label="field.label"
                          :required="field.required"
                          :prop="field.key"
                          class="fill-field-item"
                        >
                          <FillFieldControl
                            :field="field"
                            v-model="fieldValues[field.key]"
                            :candidates="hist.candidatesFor(field.key, fieldValues[field.key])"
                            :on-field-focus="() => hist.ensure(field.key)"
                          />
                        </el-form-item>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <div v-if="currentFields.length === 0 && !pageLoading" class="empty-fields">
                <el-empty description="该步骤暂无可编辑字段" :image-size="100" />
              </div>
            </el-form>

            <div v-if="currentFields.length > 0" class="form-actions">
              <el-button @click="goBack">取消</el-button>
              <el-button type="primary" :loading="loading" @click="handleSubmit">
                {{ needSign ? '提交并签署' : '提交' }}
              </el-button>
            </div>
          </template>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">

        <el-card shadow="never" class="side-card" v-loading="pageLoading">
          <template #header>
            <div class="side-card-header">
              <span class="side-card-title">📄 文档信息</span>
            </div>
          </template>
          <div class="side-info-list">
            <div class="side-info-item">
              <span class="side-info-label">文档标题</span>
              <span class="side-info-value">{{ doc.title || '-' }}</span>
            </div>
            <div class="side-info-item">
              <span class="side-info-label">文档编号</span>
              <span class="side-info-value mono">{{ doc.docNumber || '-' }}</span>
            </div>
            <div class="side-info-item">
              <span class="side-info-label">模板名称</span>
              <span class="side-info-value">{{ doc.templateName || '-' }}</span>
            </div>
            <div class="side-info-item">
              <span class="side-info-label">发起人</span>
              <span class="side-info-value">{{ doc.initiatorName || '-' }}</span>
            </div>
            <div class="side-info-item">
              <span class="side-info-label">创建时间</span>
              <span class="side-info-value">{{ formatDate(doc.createdAt) }}</span>
            </div>
            <div class="side-info-item">
              <span class="side-info-label">更新时间</span>
              <span class="side-info-value">{{ formatDate(doc.updatedAt) }}</span>
            </div>
          </div>
        </el-card>

        <el-card shadow="never" class="side-card">
          <template #header>
            <div class="side-card-header">
              <span class="side-card-title">📌 步骤进度</span>
            </div>
          </template>
          <div class="step-progress-vertical">
            <div
              v-for="s in stepProgress"
              :key="s.order"
              class="step-progress-item"
              :class="{
                'step-active': s.order === currentStep,
                'step-done': s.status === 'completed' || s.order < currentStep,
                'step-disabled': s.status === 'pending' && s.order > currentStep,
              }"
            >
              <div class="step-progress-dot">
                <span v-if="s.status === 'completed'">✓</span>
                <span v-else-if="s.order === currentStep">●</span>
                <span v-else>○</span>
              </div>
              <div class="step-progress-content">
                <div class="step-progress-label">{{ s.label }}</div>
                <div class="step-progress-status">{{ stepStatusLabel(s.status) }}</div>
                <div v-if="s.assigneeText" class="step-progress-assignee">
                  <el-icon :size="12" style="vertical-align: -2px;"><User /></el-icon>
                  <span>{{ s.assigneeText }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <el-card v-if="currentStepSnap" shadow="never" class="side-card">
          <template #header>
            <div class="side-card-header">
              <span class="side-card-title">💡 步骤指引</span>
            </div>
          </template>
          <div class="step-guide-content">
            <p class="step-guide-step">{{ currentStepSnap.label || `步骤 ${currentStep}` }}</p>
            <p v-if="currentStepSnap.description" class="step-guide-desc">{{ currentStepSnap.description }}</p>
            <p v-else class="step-guide-desc muted">请填写本步骤所需的字段信息，完成后点击"提交"按钮。</p>
            <div class="step-guide-meta">
              <span>可编辑字段：{{ currentFields.length }} 项</span>
              <span v-if="needSign" class="need-sign-badge">需要签署</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="signPasswordDialog" title="签署确认" width="420px" :close-on-click-modal="false">
      <p style="margin-bottom: 20px; color: #64748b; font-size: 14px;">请输入签名密码以解锁签名材料</p>
      <el-form label-position="top">
        <el-form-item label="签名密码" required>
          <el-input
            v-model="signPassword"
            type="password"
            show-password
            placeholder="请输入签名密码"
            size="large"
            @keyup.enter="handleSign"
          />
        </el-form-item>
        <el-form-item v-if="!userStore.hasSignatureImage" label="手写签名">
          <div class="canvas-wrapper">
            <canvas
              ref="canvasRef"
              width="400"
              height="200"
              class="signature-canvas"
              @mousedown="startDrawing"
              @mousemove="draw"
              @mouseup="stopDrawing"
              @mouseleave="stopDrawing"
              @touchstart.prevent="startDrawing"
              @touchmove.prevent="draw"
              @touchend="stopDrawing"
            />
            <div class="canvas-actions">
              <el-button size="small" @click="clearCanvas">清空重绘</el-button>
            </div>
          </div>
          <el-checkbox v-model="saveSignature" label="保存为我的默认签名" size="small" />
        </el-form-item>
        <el-form-item v-else>
          <el-tag type="success" effect="plain" style="margin-bottom: 12px">您已上传签名，将自动使用</el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="signPasswordDialog = false">取消</el-button>
        <el-button type="primary" :loading="signLoading" @click="handleSign">确认签署</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="nextAssigneeDialog" title="选择下一步填写人" width="480px" :close-on-click-modal="false">
      <p style="margin-bottom: 16px; color: #64748b; font-size: 14px;">下一步为「由上一步指定」类型，请从通讯录中选择一位填写人</p>
      <DeptTreePicker
        mode="user"
        :model-value="nextAssigneeId"
        @update:model-value="nextAssigneeId = $event as string"
      />
      <template #footer>
        <el-button @click="nextAssigneeDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmNextAssignee">确认提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.fill-page {
  margin: 0 auto;
}

.fill-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.fill-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.doc-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--srs-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-number {
  font-size: 13px;
  color: var(--srs-text-tertiary);
  font-family: var(--srs-font-mono);
  flex-shrink: 0;
}

.fill-card, .side-card {
  border-radius: var(--srs-radius-lg);
  border: 1px solid var(--srs-border);
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
}

.card-header-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.side-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--srs-text-primary);
}

.fill-steps {
  margin-bottom: 28px;
  padding: 0 20px;
}

.step-guide {
  margin-bottom: 20px;
}

.readonly-card {
  border-radius: var(--srs-radius-lg);
  border: 1px dashed var(--srs-border);
  margin-bottom: 20px;
  background: var(--srs-bg-page, #f8fafc);
}

.readonly-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--srs-text-secondary);
}

.fill-form {
  max-width: 640px;
  margin: 0 auto;
}

.fill-form :deep(.el-form-item) {
  margin-bottom: 22px;
}

.fill-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--srs-text-primary);
  flex-shrink: 0;
  line-height: 1.5;
  word-break: break-word;
}

.fill-form :deep(.el-form-item.is-required .el-form-item__label::before) {
  vertical-align: middle;
}

.fill-form :deep(.el-input-number .el-input-number__decrease),
.fill-form :deep(.el-input-number .el-input-number__increase) {
  display: none;
}

.fill-form :deep(.el-input-number) {
  width: 100%;
}

.fill-field-item :deep(.el-form-item__content) {
  display: block;
}

.empty-fields {
  padding: 20px 0;
}

.form-actions {
  max-width: 640px;
  margin: 32px auto 0;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid var(--srs-border-light);
}

.side-info-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.side-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--srs-border-light, #f0f0f0);
  font-size: 13px;
}

.side-info-item:last-child {
  border-bottom: none;
}

.side-info-label {
  color: var(--srs-text-tertiary, #909399);
  flex-shrink: 0;
  margin-right: 12px;
}

.side-info-value {
  color: var(--srs-text-primary, #303133);
  font-weight: 500;
  text-align: right;
  word-break: break-all;
}

.side-info-value.mono {
  font-family: var(--srs-font-mono, monospace);
  font-size: 12px;
}

.step-progress-vertical {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 4px 0;
}

.step-progress-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  position: relative;
}

.step-progress-item::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 30px;
  bottom: -10px;
  width: 2px;
  background: var(--srs-border-light, #e0e0e0);
}

.step-progress-item:last-child::before {
  display: none;
}

.step-progress-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
  margin-top: 2px;
  background: var(--srs-bg-card, #fff);
  border: 2px solid var(--srs-border, #d0d0d0);
  color: var(--srs-text-tertiary, #909399);
}

.step-progress-item.step-done .step-progress-dot {
  background: var(--srs-success, #67c23a);
  border-color: var(--srs-success, #67c23a);
  color: #fff;
  font-weight: bold;
}

.step-progress-item.step-active .step-progress-dot {
  background: var(--srs-primary, #409eff);
  border-color: var(--srs-primary, #409eff);
  color: #fff;
  font-size: 12px;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}

.step-progress-content {
  flex: 1;
  min-width: 0;
}

.step-progress-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--srs-text-primary, #303133);
  line-height: 1.4;
}

.step-progress-item.step-disabled .step-progress-label {
  color: var(--srs-text-tertiary, #b0b0b0);
}

.step-progress-status {
  font-size: 11px;
  color: var(--srs-text-tertiary, #909399);
  margin-top: 2px;
}

.step-progress-assignee {
  font-size: 11px;
  color: var(--srs-text-tertiary, #909399);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-progress-item.step-active .step-progress-status {
  color: var(--srs-primary, #409eff);
  font-weight: 500;
}

.step-guide-content {
  font-size: 13px;
  line-height: 1.6;
}

.step-guide-step {
  font-weight: 600;
  color: var(--srs-text-primary);
  margin: 0 0 8px;
  font-size: 14px;
}

.step-guide-desc {
  color: var(--srs-text-secondary);
  margin: 0 0 12px;
}

.step-guide-desc.muted {
  color: var(--srs-text-tertiary);
}

.step-guide-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--srs-border-light);
  font-size: 12px;
  color: var(--srs-text-tertiary);
}

.need-sign-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  background: #fff3e0;
  color: #e65100;
  font-size: 11px;
  font-weight: 500;
}

.canvas-wrapper {
  width: 100%;
}

.signature-canvas {
  width: 100%;
  max-width: 400px;
  height: 200px;
  border: 2px dashed var(--srs-border-input);
  border-radius: 8px;
  cursor: crosshair;
  touch-action: none;
  background: var(--srs-bg-card);
  display: block;
}

.canvas-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.field-image {
  max-width: 240px;
  max-height: 120px;
  border-radius: 6px;
  border: 1px solid var(--srs-border-light);
  object-fit: contain;
  display: inline-block;
  vertical-align: middle;
}
.signed-badge {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #059669;
  font-size: 12px;
  vertical-align: middle;
}
.readonly-field-row { display: flex; align-items: flex-start; gap: 8px; padding: 3px 0; }
.readonly-field-label { flex-shrink: 0; color: var(--srs-text-secondary); min-width: 80px; }
.readonly-field-value { color: var(--srs-text-primary); word-break: break-all; }

.doc-block {
  margin-bottom: 16px;
  border-radius: 10px;

  border: 1px solid var(--dc-block-border);
  border-left: 3px solid var(--dc-block-accent);
  background: var(--dc-block-bg);
}
.doc-block.is-container {
  --dc-block-border: var(--dc-container-border);
  --dc-block-accent: var(--dc-container-accent);
  --dc-block-bg: var(--dc-container-bg);
}
.doc-block.is-group {
  --dc-block-border: var(--dc-group-border);
  --dc-block-accent: var(--dc-group-accent);
  --dc-block-bg: var(--dc-group-bg);
}
.doc-block.is-free {
  --dc-block-border: transparent;
  --dc-block-bg: transparent;
  padding-left: 4px;
}
.doc-block--nested { margin: 8px 0 8px 16px; }
.doc-block-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px; }
.doc-block-header.is-collapsible { cursor: pointer; user-select: none; }
.doc-block-label { font-size: 14px; font-weight: 600; color: var(--srs-text-primary); }
.block-arrow { font-size: 14px; color: var(--srs-text-tertiary); transition: transform .2s ease; flex-shrink: 0; }
.block-arrow--open { transform: rotate(90deg); }
.block-collapsed-hint { font-size: 12px; color: var(--srs-text-tertiary); margin-left: auto; white-space: nowrap; }
.doc-block-body { padding: 0 14px 12px; }
.doc-block-body .fill-field-item:first-child { margin-top: 4px; }
</style>