<script setup lang="ts">
import { ref, onMounted, onActivated, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { documentAPI, directoryAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { useSignatureTempStore } from '@/stores/signature'
import { showToast } from 'vant'
import { BaseIcon, IconCheck, IconUser, IconPending, IconUndo, IconFileText } from '@/components'
import FieldHistorySuggest from '@/components/FieldHistorySuggest.vue'
import SmoothSignaturePad from '@/components/SmoothSignaturePad.vue'
import RecursiveFieldBlock from '@/components/RecursiveFieldBlock.vue'
import { buildStepFieldBlocks } from '@/utils/fieldBlocks'
import { stepStatusText, formatDate } from '@/utils/documentUtils'
import { useFieldHistory } from '@/composables/useFieldHistory'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const sigTempStore = useSignatureTempStore()
const docId = route.params.id as string

const hist = useFieldHistory(docId)

const doc = ref<any>({})
const currentStep = ref(1)
const totalSteps = ref(1)
const fieldValues = ref<Record<string, any>>({})
const pageLoading = ref(true)
const submitting = ref(false)
const signLoading = ref(false)

const signDialogVisible = ref(false)
const signPassword = ref('')
const previewSignatureDataUrl = ref<string | null>(null)

const nextAssigneeDialog = ref(false)
const nextAssigneeId = ref<string | null>(null)
const assigneeKeyword = ref('')
const assigneeResults = ref<any[]>([])

const signatureRef = ref()
const saveSignature = ref(false)
const signatureImg = ref<string | null>(null)

watch(signDialogVisible, (visible) => {
  if (!visible) {
    signPassword.value = ''
    saveSignature.value = false
    signatureImg.value = null
    previewSignatureDataUrl.value = null
    if (signatureRef.value) {
      signatureRef.value.clear?.()
    }
  }
})

function checkTempSignature() {
  const temp = sigTempStore.consumeTemp()
  if (temp) {
    nextTick(() => {
      signatureImg.value = temp.image
      previewSignatureDataUrl.value = temp.image
      saveSignature.value = temp.save
      signDialogVisible.value = true
    })
  }
}

onMounted(() => { checkTempSignature() })
onActivated(() => { checkTempSignature() })

const datePickerVisible = ref(false)
const dateValue = ref<string[]>([])
const dateFieldKey = ref('')

const selectPickerVisible = ref(false)
const selectFieldKey = ref('')

const historyPanelVisible = ref(false)
const historyFieldKey = ref('')

function openHistory(fieldKey: string) {
  hist.ensure(fieldKey)
  historyFieldKey.value = fieldKey
  historyPanelVisible.value = true
}

function ensureHistory(fieldKey: string) {
  hist.ensure(fieldKey)
}

const historyCandidates = computed(() => {
  const key = historyFieldKey.value
  if (!key) return []
  return hist.candidatesFor(key, fieldValues.value[key], false)
})
const historyLoading = computed(() => {
  const key = historyFieldKey.value
  if (!key) return false
  return hist.loading.value?.[key] || false
})
const historyFieldLabel = computed(() => {
  const f = allFields.value.find((fi: any) => fi.key === historyFieldKey.value)
  return f?.label || ''
})

const historyCacheComputed = computed(() => hist.cache.value)
const historyLoadingComputed = computed(() => hist.loading.value)

function onHistoryPick(value: string | number) {
  const key = historyFieldKey.value
  if (key) fieldValues.value[key] = value
}

const collapsedKeys = ref<Set<string>>(new Set())

function toggleCollapse(key: string) {
  const next = new Set(collapsedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedKeys.value = next
}

function onFieldValueUpdate(key: string, val: any) {
  fieldValues.value[key] = val
}

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

const allFields = computed(() => {
  const snap = doc.value.snapshot
  if (!snap?.fields) return []
  return [...snap.fields].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
})

const currentFields = computed(() => {
  return allFields.value.filter((f: any) => (fieldPermissions.value[f.key] ?? 0) === 2)
})

const readOnlyFields = computed(() => {
  return allFields.value.filter((f: any) => (fieldPermissions.value[f.key] ?? 0) === 1)
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

onMounted(async () => {
  try {
    const res: any = await documentAPI.getDetail(docId)
    const data = res.data || res
    doc.value = data
    currentStep.value = data.currentStep || 1
    totalSteps.value = data.snapshot?.steps?.length || 1
    const fv: Record<string, any> = {}
    for (const item of (data.fieldValues || [])) {
      fv[item.fieldKey] = item.value
    }
    fieldValues.value = fv
  } catch {   } finally {
    pageLoading.value = false
  }
})

async function handleSubmit() {
  if (needSign.value) {
    if (userStore.hasSignatureImage) {
      previewSignatureDataUrl.value = null
      signDialogVisible.value = true
    } else {
      router.push('/sign/' + docId)
    }
  } else {
    if (nextStepIsHandoff.value) {
      openAssigneeDialog()
    } else {
      await submitStep(false)
    }
  }
}

async function submitStep(shouldSign: boolean) {
  submitting.value = true
  try {
    const currentStepFields = currentFields.value
    const editableFieldValues: Record<string, any> = {}
    for (const f of currentStepFields) {
      if (fieldValues.value[f.key] !== undefined && fieldValues.value[f.key] !== '') {
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
    if (signatureImg.value) {
      data.handwrittenSignature = signatureImg.value
      data.saveSignature = saveSignature.value
    }
    if (nextStepIsHandoff.value && nextAssigneeId.value) {
      data.nextAssigneeId = nextAssigneeId.value
    }
    await documentAPI.submitStep(docId, currentStep.value, data)
    if (saveSignature.value && signatureImg.value) {
      userStore.hasSignatureImage = true
      localStorage.setItem('hasSignatureImage', 'true')
    }
    showToast(shouldSign ? '签署并提交成功' : '步骤提交成功')
    router.push('/documents')
  } catch (e: any) {
    showToast(e?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

async function handleSign() {
  if (signLoading.value) return
  if (!signPassword.value) {
    showToast('请输入签名密码')
    return
  }
  const sigFields = currentFields.value.filter((f: any) => f.type === 'signature')
  if (sigFields.length === 0) {
    showToast('当前步骤没有签名字段')
    return
  }

  const signatureData = previewSignatureDataUrl.value || signatureImg.value || ''

  if (!signatureData && !userStore.hasSignatureImage) {
    showToast('请先签名')
    return
  }

  for (const f of sigFields) {
    fieldValues.value[f.key] = signatureData
  }

  signLoading.value = true
  try {
    if (nextStepIsHandoff.value) {
      openAssigneeDialog()
      signLoading.value = false
      return
    }
    await submitStep(true)
    signDialogVisible.value = false
  } catch (error: any) {
    showToast(error.message || '签署失败')
  } finally {
    signLoading.value = false
  }
}

function confirmNextAssignee() {
  if (!nextAssigneeId.value) {
    showToast('请选择下一步的填写人')
    return
  }
  nextAssigneeDialog.value = false
  signDialogVisible.value = false
  submitStep(needSign.value)
}

function clearSignature() {
  signatureRef.value?.reset?.()
  signatureImg.value = null
}

function openDatePicker(field: any) {
  dateFieldKey.value = field.key
  datePickerVisible.value = true
}

function onDateConfirm({ selectedValues }: any) {
  const [y, m, d] = selectedValues
  if (dateFieldKey.value) {
    fieldValues.value[dateFieldKey.value] = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  datePickerVisible.value = false
}

function openSelectPicker(field: any) {
  selectFieldKey.value = field.key
  selectPickerVisible.value = true
}

const fieldOptionsForPicker = computed<any[]>(() => {
  const field = allFields.value.find((f: any) => f.key === selectFieldKey.value)
  return (field?.options || []).map((o: string) => ({ text: o, value: o }))
})

function onSelectConfirm({ selectedValues }: any) {
  if (selectFieldKey.value) {
    fieldValues.value[selectFieldKey.value] = selectedValues[0]
  }
  selectPickerVisible.value = false
}

let assigneeDebounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSearchAssignees() {
  if (assigneeDebounceTimer) clearTimeout(assigneeDebounceTimer)
  assigneeDebounceTimer = setTimeout(() => {
    searchAssignees()
  }, 300)
}

async function searchAssignees() {
  try {
    const res: any = await directoryAPI.users({ keyword: assigneeKeyword.value || '', page: 1, pageSize: 50 })
    assigneeResults.value = res.data?.list || []
  } catch (e: any) {
    console.warn('[DocumentFill] searchAssignees failed:', e)
    showToast(e?.message || '搜索失败')
  }
}

function openAssigneeDialog() {
  nextAssigneeDialog.value = true
  searchAssignees()
}
</script>

<template>
  <div class="fill-page">
    <van-skeleton :title="false" :row="8" :loading="pageLoading">

      <div class="m-card">
        <div class="doc-title-row">
          <span class="doc-title">{{ doc.title || '文档填写' }}</span>
          <span class="status-badge warning" v-if="doc.status === 'in_progress'">进行中</span>
        </div>
        <div class="doc-number muted mono">{{ doc.docNumber }}</div>
      </div>

      <div v-if="totalSteps > 1" class="step-progress">
        <div
          v-for="s in stepProgress"
          :key="s.order"
          class="step-progress-item"
          :class="{
            'step-active': s.order === currentStep,
            'step-done': s.status === 'completed' || s.order < currentStep,
          }"
        >
          <div class="step-dot">
            <IconCheck v-if="s.status === 'completed'" :size="12" color="#fff" />
            <span v-else-if="s.order === currentStep" class="step-dot-active"></span>
          </div>
          <div class="step-content">
            <div class="step-label" :class="{ 'muted': s.order > currentStep && s.status === 'pending' }">
              {{ s.label }}
            </div>
            <div class="step-status muted">{{ stepStatusText(s.status) }}</div>
            <div v-if="s.assigneeText" class="step-assignee muted">
              <IconUser :size="12" /> {{ s.assigneeText }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentStepSnap" class="m-card step-guide-card">
        <div class="step-guide-title">
          步骤 {{ currentStep }} — {{ currentStepSnap.label || '填写信息' }}
        </div>
        <div v-if="currentStepSnap.description" class="step-guide-desc">{{ currentStepSnap.description }}</div>
        <div class="step-guide-meta muted">
          可编辑字段 {{ currentFields.length }} 项
          <span v-if="needSign" class="status-badge warning">需要签署</span>
        </div>
      </div>

      <div v-if="readOnlyBlocks.length > 0" class="m-card">
        <div class="readonly-title">历史填写信息</div>
        <RecursiveFieldBlock
          v-for="block in readOnlyBlocks"
          :key="block.key || block.label"
          :block="block"
          mode="readonly"
          collapse-path="r:"
          :collapsed-keys="collapsedKeys"
          :field-values="fieldValues"
          @toggle-collapse="toggleCollapse"
        />
      </div>

      <van-form @submit="handleSubmit" class="fill-form">
        <div class="form-group-title" v-if="currentFields.length > 0">请填写以下信息</div>

        <template v-for="block in editableBlocks" :key="block.key || block.label">
          <RecursiveFieldBlock
            :block="block"
            mode="editable"
            collapse-path="e:"
            :collapsed-keys="collapsedKeys"
            :field-values="fieldValues"
            :history-cache="historyCacheComputed"
            :history-loading="historyLoadingComputed"
            @toggle-collapse="toggleCollapse"
            @update-field-value="onFieldValueUpdate"
            @open-date-picker="openDatePicker"
            @open-select-picker="openSelectPicker"
            @open-history="(key: string) => openHistory(key)"
            @ensure-history="(key: string) => ensureHistory(key)"
          />
        </template>

        <div v-if="currentFields.length === 0" class="empty-fields">
          <van-empty description="该步骤暂无可编辑字段" />
        </div>

        <div v-if="currentFields.length > 0" class="form-actions">
          <van-button block type="primary" native-type="submit" :loading="submitting" loading-text="提交中...">
            {{ needSign ? '提交并签署' : '提交' }}
          </van-button>
        </div>
      </van-form>

      <div class="page-bottom-space"></div>
    </van-skeleton>

    <van-popup v-model:show="datePickerVisible" position="bottom" round>
      <van-date-picker
        v-model="dateValue"
        title="选择日期"
        @confirm="onDateConfirm"
        @cancel="datePickerVisible = false"
      />
    </van-popup>

    <van-popup v-model:show="selectPickerVisible" position="bottom" round>
      <van-picker
        :columns="fieldOptionsForPicker"
        title="请选择"
        @confirm="onSelectConfirm"
        @cancel="selectPickerVisible = false"
      />
    </van-popup>

    <van-popup v-model:show="signDialogVisible" position="bottom" round :style="{ height: `70%` }" :close-on-click-overlay="false">
      <div class="sign-dialog-fullscreen">
        <div class="sign-header">
          <van-button size="small" plain @click="signDialogVisible = false">取消</van-button>
          <span class="sign-title">确认签署</span>
          <van-button size="small" type="primary" :loading="signLoading" loading-text="签署中..." @click="handleSign">确认签署</van-button>
        </div>
        <div class="sign-content">

          <div class="signature-preview-box">
            <img v-if="previewSignatureDataUrl" :src="previewSignatureDataUrl" class="signature-preview-img" alt="签名预览" />
            <div v-else class="signature-placeholder">
              <span class="status-badge info">待签署</span>
            </div>
          </div>

          <p class="sign-dialog-tip">请输入签名密码以确认签署</p>
          <van-field
            v-model="signPassword"
            type="password"
            placeholder="请输入签名密码"
            label="签名密码"
            clearable
          />
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="nextAssigneeDialog" position="bottom" round title="选择下一步填写人">
      <div class="assignee-dialog">
        <p class="assignee-tip">下一步为「由上一步指定」类型，请选择一位填写人</p>
        <van-field
          v-model="assigneeKeyword"
          placeholder="搜索姓名或部门"
          clearable
          @update:model-value="debouncedSearchAssignees"
        />
        <div class="assignee-list">
          <van-cell
            v-for="u in assigneeResults"
            :key="u.id"
            :title="u.name"
            :label="u.departmentName || ''"
            @click="nextAssigneeId = u.id"
          >
            <template #right-icon>
              <BaseIcon
                :name="nextAssigneeId === u.id ? 'check' : 'info'"
                :color="nextAssigneeId === u.id ? 'var(--srs-primary)' : 'var(--srs-text-tertiary)'"
              />
            </template>
          </van-cell>
        </div>
        <div class="assignee-actions">
          <van-button block type="primary" :loading="submitting" @click="confirmNextAssignee">确认提交</van-button>
        </div>
      </div>
    </van-popup>

    <FieldHistorySuggest
      v-model:show="historyPanelVisible"
      :candidates="historyCandidates"
      :loading="historyLoading"
      :field-label="historyFieldLabel"
      @pick="onHistoryPick"
    />
  </div>
</template>

<style scoped>
.fill-page {
  padding: 12px;
  background: var(--srs-bg-page);
  padding-bottom: 70px;
}
.doc-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.doc-title { font-size: 17px; font-weight: 600; color: var(--srs-text-primary); flex: 1; min-width: 0; }
.doc-number { font-size: 12px; }
.step-progress { background: var(--srs-bg-card); border-radius: var(--srs-radius-lg); border: 1px solid var(--srs-border); padding: 14px 16px; margin-bottom: 12px; }
.step-progress-item { display: flex; gap: 12px; position: relative; padding-bottom: 16px; }
.step-progress-item:last-child { padding-bottom: 0; }
.step-progress-item::before { content: ''; position: absolute; left: 7px; top: 22px; bottom: 8px; width: 2px; background: var(--srs-border-light); }
.step-progress-item:last-child::before { display: none; }
.step-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--srs-border); background: var(--srs-bg-card); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
.step-progress-item.step-done .step-dot { background: var(--srs-success); border-color: var(--srs-success); }
.step-progress-item.step-active .step-dot { background: var(--srs-primary); border-color: var(--srs-primary); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); }
.step-dot-active { width: 6px; height: 6px; border-radius: 50%; background: #fff; }
.step-content { flex: 1; min-width: 0; }
.step-label { font-size: 14px; font-weight: 500; color: var(--srs-text-primary); }
.step-status { font-size: 12px; margin-top: 2px; }
.step-assignee { font-size: 12px; margin-top: 2px; display: flex; align-items: center; gap: 3px; }
.step-guide-title { font-size: 15px; font-weight: 600; color: var(--srs-text-primary); margin-bottom: 8px; }
.step-guide-desc { font-size: 13px; color: var(--srs-text-secondary); line-height: 1.6; margin-bottom: 8px; }
.step-guide-meta { font-size: 12px; display: flex; gap: 8px; align-items: center; }
.readonly-title { font-size: 14px; font-weight: 600; color: var(--srs-text-secondary); margin-bottom: 10px; }
.form-group-title { padding: 12px 16px 4px; font-size: 14px; font-weight: 600; color: var(--srs-text-primary); }
.empty-fields { padding: 20px 0; }
.form-actions { padding: 20px 16px; }
.sign-dialog-body { padding: 16px; }
.sign-dialog-tip { font-size: 13px; color: var(--srs-text-secondary); margin-bottom: 16px; }
.signature-pad { margin: 12px 0; }
.save-signature-row { margin: 8px 0 12px; }
.sign-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }

.sign-dialog-fullscreen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sign-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--srs-border-light, #ebeef5);
}

.sign-title {
  font-weight: 600;
  font-size: 16px;
}

.sign-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.signature-preview-box {
  min-height: 80px;
  background: #f9fafb;
  border: 1px solid var(--srs-border-light, #e5e7eb);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  overflow: hidden;
}

.signature-preview-img {
  max-width: 100%;
  max-height: 120px;
  object-fit: contain;
}

.signature-placeholder {
  padding: 12px;
  color: var(--srs-text-tertiary);
}

.signature-pad-fullscreen {
  margin: 16px 0;
}

.smooth-signature-fullscreen {
  max-height: none !important;
  height: 60vh;
}

.smooth-signature-fullscreen .smooth-toolbar {
  background: #fff;
  position: sticky;
  bottom: 0;
  z-index: 10;
}
.assignee-dialog { padding: 16px 16px 24px; height: 60vh; display: flex; flex-direction: column; }
.assignee-tip { font-size: 13px; color: var(--srs-text-secondary); margin-bottom: 12px; }
.assignee-list { flex: 1; overflow-y: auto; margin-top: 8px; }
.assignee-actions { padding-top: 12px; }
</style>