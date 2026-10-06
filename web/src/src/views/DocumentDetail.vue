<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { documentAPI } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { buildStepFieldBlocks, isImageFieldType, isImageValue } from '@/utils/fieldBlocks'

const route = useRoute()
const router = useRouter()
const docId = route.params.id as string

const doc = ref<any>({})
const stepInstances = ref<any[]>([])
const fieldValues = ref<any[]>([])
const documentLoading = ref(false)
const actionLoading = ref(false)

function statusMap(s: string) {
  const m: Record<string, { label: string; type: string }> = {
    draft: { label: '草稿', type: 'info' },
    in_progress: { label: '进行中', type: 'warning' },
    completed: { label: '已完成', type: 'success' },
    terminated: { label: '已终止', type: 'danger' },
    withdrawn: { label: '已撤回', type: 'info' },
  }
  return m[s] || { label: s, type: 'info' }
}

function stepStatusMap(s: string) {
  const m: Record<string, { label: string; type: string }> = {
    pending: { label: '待处理', type: 'info' },
    in_progress: { label: '进行中', type: 'warning' },
    completed: { label: '已完成', type: 'success' },
    returned: { label: '已退回', type: 'default' },
    skipped: { label: '已跳过', type: 'info' },
  }
  return m[s] || { label: s, type: 'info' }
}

function getSnapshotSteps(): any[] {
  try {
    const snapshot = doc.value.snapshot
    if (!snapshot?.steps) return []
    return snapshot.steps
  } catch {
    return []
  }
}

function getSnapshotFields(): any[] {
  try {
    const snapshot = doc.value.snapshot
    if (!snapshot?.fields) return []
    return snapshot.fields
  } catch {
    return []
  }
}

function findFieldDef(key: string): any {
  return getSnapshotFields().find((f: any) => f.key === key)
}

const filledFieldsByStep = computed(() => {
  const steps = getSnapshotSteps()
  const defs = getSnapshotFields()
  const valueMap = new Map<string, any>()
  for (const fv of fieldValues.value) {
    valueMap.set(fv.fieldKey, fv)
  }
  const structureNodes = defs.filter((f: any) => f.type === 'container' || f.type === 'group')

  const result: any[] = []
  for (const step of steps) {
    const keys: string[] = step.fieldKeys || []
    const filledLeaves = keys
      .map((k: string) => {
        const fv = valueMap.get(k)
        if (!fv) return null
        const def = findFieldDef(k)
        if (!def || def.type === 'container' || def.type === 'group') return null
        return { ...def, value: fv.value }
      })
      .filter((x: any) => x !== null)
    if (filledLeaves.length === 0) continue

    const blocks = buildStepFieldBlocks([...structureNodes, ...filledLeaves])
    result.push({
      stepOrder: step.order,
      label: step.label || `步骤 ${step.order}`,
      blocks,
    })
  }
  return result
})

const stepProgress = computed(() => {
  const steps = getSnapshotSteps().slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
  const instMap = new Map<number, any>()
  for (const inst of stepInstances.value) instMap.set(inst.stepOrder, inst)
  const cur = doc.value.currentStep
  const allDone = doc.value.status === 'completed'
  return steps.map((s: any) => {
    const inst = instMap.get(s.order)
    let status: string
    if (inst) {
      status = ({ completed: 'success', in_progress: 'process', returned: 'error', pending: 'wait' } as Record<string, string>)[inst.status] || 'wait'
    } else if (allDone || (cur && s.order < cur)) {
      status = 'success'
    } else if (cur && s.order === cur) {
      status = 'process'
    } else {
      status = 'wait'
    }
    return { order: s.order, label: s.label || `步骤 ${s.order}`, status }
  })
})

function formatFieldValue(val: any, fieldKey?: string): string {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'boolean') return val ? '是' : '否'

  if (fieldKey) {
    const def = findFieldDef(fieldKey)
    if (def?.type === 'signature') {
      return '✍ 已签署'
    }
  }

  return String(val)
}

onMounted(async () => {
  documentLoading.value = true
  try {
    const res: any = await documentAPI.getDetail(docId)
    doc.value = res.data || {}
    stepInstances.value = res.data?.stepInstances || []
    fieldValues.value = res.data?.fieldValues || []
  } catch {
  } finally {
    documentLoading.value = false
  }
})

function goBack() {
  router.push('/documents')
}

function goFill() {
  router.push(`/documents/${docId}/fill`)
}

async function downloadPDF() {
  try {
    const blob = await documentAPI.downloadPDF(docId) as unknown as Blob
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank')
  } catch {
  }
}

async function handleReturnStep() {
  try {
    await ElMessageBox.confirm('确定将文档退回上一步吗？退回后上一步负责人可重新提交。', '退回确认', {
      confirmButtonText: '确定退回',
      cancelButtonText: '取消',
      type: 'warning',
    })
    actionLoading.value = true
    await documentAPI.returnStep(docId)
    ElMessage.success('已退回上一步')
    const res: any = await documentAPI.getDetail(docId)
    doc.value = res.data || {}
    stepInstances.value = res.data?.stepInstances || []
  } catch {
  } finally {
    actionLoading.value = false
  }
}

async function handleReject() {
  try {
    await ElMessageBox.confirm('确定驳回终止该文档吗？此操作不可撤销。', '驳回终止', {
      confirmButtonText: '确定驳回',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    })
    actionLoading.value = true
    await documentAPI.rejectDocument(docId)
    ElMessage.success('文档已驳回终止')
    const res: any = await documentAPI.getDetail(docId)
    doc.value = res.data || {}
    stepInstances.value = res.data?.stepInstances || []
  } catch {
  } finally {
    actionLoading.value = false
  }
}

async function handleWithdraw() {
  try {
    await ElMessageBox.confirm('确定撤回该文档吗？撤回后文档将变为草稿状态。', '撤回确认', {
      confirmButtonText: '确定撤回',
      cancelButtonText: '取消',
      type: 'warning',
    })
    actionLoading.value = true
    await documentAPI.withdrawDocument(docId)
    ElMessage.success('文档已撤回')
    const res: any = await documentAPI.getDetail(docId)
    doc.value = res.data || {}
    stepInstances.value = res.data?.stepInstances || []
  } catch {
  } finally {
    actionLoading.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" text bg icon="ArrowLeft">返回</el-button>
        <div class="header-title-group">
          <h2 class="page-title">{{ doc.title || '文档详情' }}</h2>
          <span class="doc-number">{{ doc.docNumber }}</span>
          <el-tag
            :type="statusMap(doc.status).type as any"
            effect="plain"
            size="small"
          >
            {{ statusMap(doc.status).label }}
          </el-tag>
        </div>
      </div>
    </div>

    <el-row :gutter="24">

      <el-col :xs="24" :lg="16">
        <el-card shadow="never" class="content-card" v-loading="documentLoading">
          <template #header>
            <span class="section-title">文档信息</span>
          </template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="文档编号">{{ doc.docNumber || '-' }}</el-descriptions-item>
            <el-descriptions-item label="文档标题">{{ doc.title || '-' }}</el-descriptions-item>
            <el-descriptions-item label="当前步骤">
              <template v-if="doc.status === 'completed'">已完成</template>
              <template v-else>{{ doc.currentStep || '-' }}</template>
            </el-descriptions-item>
            <el-descriptions-item label="文档状态">
              <el-tag
                :type="statusMap(doc.status).type as any"
                effect="plain"
                size="small"
              >
                {{ statusMap(doc.status).label }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ doc.createdAt ? new Date(doc.createdAt).toLocaleString() : '-' }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : '-' }}</el-descriptions-item>
          </el-descriptions>

          <div class="steps-section">
            <h3 class="section-title">步骤进度</h3>
            <el-steps direction="vertical" class="detail-steps">
              <el-step
                v-for="(step, index) in stepProgress"
                :key="step.order ?? index"
                :title="'步骤 ' + ((step.order ?? index + 1)) + '：' + (step.label || ('步骤' + (index + 1)))"
                :status="step.status as any"
              />
            </el-steps>
          </div>
        </el-card>

        <el-card shadow="never" class="content-card" v-if="filledFieldsByStep.length > 0">
          <template #header>
            <span class="section-title">填写内容</span>
          </template>
          <div v-for="(group, gi) in filledFieldsByStep" :key="gi" class="filled-group">
            <h4 class="filled-step-title">{{ group.label }}</h4>
            <div v-for="block in group.blocks" :key="block.key || block.label" class="detail-block">
              <div class="detail-block-header">
                <span class="detail-block-label">{{ block.label }}</span>
                <el-tag v-if="block.type === 'container'" size="small" color="#13c2c2" effect="dark">行容器</el-tag>
                <el-tag v-else-if="block.type === 'group'" size="small" color="#fa8c16" effect="dark">字段分组</el-tag>
                <el-tag v-else size="small" type="info" effect="plain">独立字段</el-tag>
              </div>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item v-for="item in block.fields" :key="item.key" :label="item.label">
                  <img v-if="isImageFieldType(item.type) && isImageValue(item.value)" :src="item.value" class="field-image" alt="" />
                  <span v-else>{{ formatFieldValue(item.value, item.key) }}</span>
                </el-descriptions-item>
              </el-descriptions>

              <div v-for="child in block.children" :key="child.key" class="detail-nested">
                <div class="detail-nested-title">{{ child.label }}</div>
                <el-descriptions :column="2" border size="small">
                  <el-descriptions-item v-for="item in child.fields" :key="item.key" :label="item.label">
                    <img v-if="isImageFieldType(item.type) && isImageValue(item.value)" :src="item.value" class="field-image" alt="" />
                    <span v-else>{{ formatFieldValue(item.value, item.key) }}</span>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="content-card">
          <template #header>
            <span class="section-title">操作</span>
          </template>
          <div class="action-buttons">
            <el-button
              v-if="doc.status === 'in_progress'"
              type="primary"
              class="action-btn"
              @click="goFill"
              :loading="actionLoading"
            >
              去填写
            </el-button>
            <el-button
              class="action-btn"
              @click="downloadPDF"
            >
              下载PDF
            </el-button>
            <el-button
              v-if="doc.status === 'in_progress' && (doc.currentStep || 0) > 1"
              class="action-btn"
              @click="handleReturnStep"
              :loading="actionLoading"
            >
              退回上一步
            </el-button>
            <el-button
              v-if="doc.status === 'in_progress'"
              type="danger"
              class="action-btn"
              @click="handleReject"
              :loading="actionLoading"
            >
              驳回终止
            </el-button>
            <el-button
              v-if="doc.status === 'in_progress'"
              class="action-btn"
              @click="handleWithdraw"
              :loading="actionLoading"
            >
              撤回
            </el-button>
          </div>
        </el-card>

        <el-card shadow="never" class="content-card" style="margin-top: 16px;">
          <template #header>
            <span class="section-title">步骤实例</span>
          </template>
          <div v-if="stepInstances.length === 0" class="empty-state">
            暂无步骤实例数据
          </div>
          <div v-else class="step-instances-list">
            <div
              v-for="inst in stepInstances"
              :key="inst.id"
              class="step-instance-item"
            >
              <div class="step-instance-header">
                <span class="step-instance-order">步骤 {{ inst.stepOrder }}</span>
                <el-tag
                  :type="stepStatusMap(inst.status).type as any"
                  effect="plain"
                  size="small"
                >
                  {{ stepStatusMap(inst.status).label }}
                </el-tag>
              </div>
              <div class="step-instance-meta">
                <span v-if="inst.completedAt" class="step-instance-time">
                  完成时间：{{ new Date(inst.completedAt).toLocaleString() }}
                </span>
                <span v-else-if="inst.createdAt" class="step-instance-time">
                  到达时间：{{ new Date(inst.createdAt).toLocaleString() }}
                </span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.page-container {
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--srs-text-primary);
  margin: 0;
}

.doc-number {
  font-size: 13px;
  color: var(--srs-text-tertiary);
  font-family: var(--srs-font-mono);
}

.content-card {
  border-radius: var(--srs-radius-lg);
  border: 1px solid var(--srs-border);
  margin-bottom: 24px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
}

.steps-section {
  margin-top: 28px;
}

.steps-section .section-title {
  margin-bottom: 16px;
  display: block;
}

.filled-group {
  margin-bottom: 20px;
}

.filled-group:last-child {
  margin-bottom: 0;
}

.filled-step-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--srs-text-primary);
  margin: 0 0 12px;
  padding-left: 8px;
  border-left: 3px solid var(--srs-primary);
}

.detail-block { margin-bottom: 16px; }
.detail-block-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.detail-block-label { font-size: 14px; font-weight: 600; color: var(--srs-text-primary); }
.detail-nested { margin-left: 12px; border-left: 2px solid var(--srs-border-light); padding-left: 10px; }
.detail-nested-title { font-size: 13px; font-weight: 600; color: var(--srs-text-secondary); margin-bottom: 8px; }
.field-image { max-width: 240px; max-height: 120px; border-radius: 6px; border: 1px solid var(--srs-border-light); object-fit: contain; vertical-align: middle; }
.signed-badge { margin-left: 8px; padding: 1px 8px; border-radius: 10px; background: #ecfdf5; color: #059669; font-size: 12px; }

.detail-steps {
  padding: 0 8px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  width: 100%;
}

.step-instances-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-instance-item {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--srs-border-light);
  background: var(--srs-bg-hover);
}

.step-instance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.step-instance-order {
  font-size: 14px;
  font-weight: 500;
  color: var(--srs-text-primary);
}

.step-instance-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-instance-time {
  font-size: 12px;
  color: var(--srs-text-tertiary);
}

.empty-state {
  text-align: center;
  padding: 32px 0;
  color: var(--srs-text-tertiary);
  font-size: 14px;
}
</style>