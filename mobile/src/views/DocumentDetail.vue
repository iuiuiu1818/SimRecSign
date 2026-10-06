<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { documentAPI } from '@/api'
import { showDialog, showToast } from 'vant'
import RecursiveFieldBlock from '@/components/RecursiveFieldBlock.vue'
import { buildStepFieldBlocks } from '@/utils/fieldBlocks'
import { statusLabel, statusBadge, stepStatusText, formatDate } from '@/utils/documentUtils'

const route = useRoute()
const router = useRouter()
const docId = route.params.id as string

const doc = ref<any>({})
const loading = ref(true)

const steps = computed(() => {
  const snap = doc.value.snapshot
  if (!snap?.steps) return []
  return snap.steps
    .slice()
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    .map((s: any) => {
      const inst = (doc.value.stepInstances || []).find((i: any) => i.stepOrder === s.order)
      return { ...s, instance: inst }
    })
})

const filledFieldBlocks = computed(() => {
  const snap = doc.value.snapshot
  if (!snap?.fields) return []
  const defMap = new Map<string, any>()
  for (const f of snap.fields) defMap.set(f.key, f)
  const fvs = doc.value.fieldValues || []
  const filled = fvs
    .map((fv: any) => {
      const def = defMap.get(fv.fieldKey)
      if (!def || def.type === 'container' || def.type === 'group') return null
      return { ...def, value: fv.value }
    })
    .filter((x: any) => x !== null)
  if (filled.length === 0) return []
  const structureNodes = snap.fields.filter((f: any) => f.type === 'container' || f.type === 'group')
  return buildStepFieldBlocks([...structureNodes, ...filled])
})

const activeStepIndex = computed(() => {
  const list = steps.value
  if (list.length === 0) return 0
  if (doc.value.status === 'completed') return list.length - 1
  const idx = list.findIndex((s: any) => s.instance?.status === 'in_progress')
  if (idx >= 0) return idx
  const cur = doc.value.currentStep
  if (cur && cur > 0) {
    const byOrder = list.findIndex((s: any) => s.order === cur)
    if (byOrder >= 0) return byOrder
  }
  return 0
})

onMounted(async () => {
  try {
    const res: any = await documentAPI.getDetail(docId)
    const data = res.data || res
    doc.value = data
  } catch (e: any) {
    showToast(e?.message || '加载文档详情失败')
  } finally {
    loading.value = false
  }
})

function goFill() {
  router.push(`/documents/${docId}/fill`)
}

async function downloadPDF() {
  try {
    const blob: any = await documentAPI.downloadPDF(docId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document-${docId}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e: any) {
    showToast(e?.message || '下载失败')
  }
}

function viewPDF() {
  router.push(`/documents/${docId}/pdf`)
}

async function returnStep() {
  showDialog({
    title: '退回上一步',
    message: '确定将文档退回上一步？',
    confirmButtonText: '退回',
  }).then(async () => {
    try {
      await documentAPI.returnStep(docId)
      showToast('已退回')
      try {
        const res: any = await documentAPI.getDetail(docId)
        doc.value = res.data || res
      } catch {   }
    } catch (e: any) { showToast(e?.message || '操作失败') }
  }).catch(() => {})
}

async function rejectDoc() {
  showDialog({
    title: '驳回终止',
    message: '确定驳回终止该文档？此操作不可撤销。',
    confirmButtonText: '驳回',
  }).then(async () => {
    try {
      await documentAPI.rejectDocument(docId)
      showToast('已驳回')
      try {
        const res: any = await documentAPI.getDetail(docId)
        doc.value = res.data || res
      } catch {   }
    } catch (e: any) { showToast(e?.message || '操作失败') }
  }).catch(() => {})
}

async function withdrawDoc() {
  showDialog({
    title: '撤回',
    message: '确定撤回该文档？',
    confirmButtonText: '撤回',
  }).then(async () => {
    try {
      await documentAPI.withdrawDocument(docId)
      showToast('已撤回')
      try {
        const res: any = await documentAPI.getDetail(docId)
        doc.value = res.data || res
      } catch {   }
    } catch (e: any) { showToast(e?.message || '操作失败') }
  }).catch(() => {})
}

const actionSheetVisible = ref(false)

const actionItems = computed(() => {
  const items: { name: string; color?: string }[] = []
  items.push({ name: '下载PDF' })
  items.push({ name: '查看PDF' })
  if (doc.value.status === 'in_progress' && doc.value.currentStep > 1) {
    items.push({ name: '退回上一步', color: 'var(--srs-warning)' })
  }
  if (doc.value.status === 'in_progress') {
    items.push({ name: '驳回终止', color: 'var(--srs-danger)' })
    items.push({ name: '撤回', color: 'var(--srs-warning)' })
  }
  return items
})

function onActionSelect(action: { name: string }) {
  actionSheetVisible.value = false
  switch (action.name) {
    case '下载PDF': downloadPDF(); break
    case '查看PDF': viewPDF(); break
    case '退回上一步': returnStep(); break
    case '驳回终止': rejectDoc(); break
    case '撤回': withdrawDoc(); break
  }
}

function showActions() {
  actionSheetVisible.value = true
}
</script>

<template>
  <div class="page-container">
    <van-skeleton :title="true" :row="8" :loading="loading">
      <template v-if="!loading">

        <div class="m-card">
          <div class="doc-title-row">
            <span class="doc-title">{{ doc.title || '未命名文档' }}</span>
            <span class="status-badge" :class="statusBadge(doc.status)">{{ statusLabel(doc.status) }}</span>
          </div>
          <div class="doc-number muted mono">{{ doc.docNumber }}</div>
        </div>

        <div class="m-card">
          <van-cell-group :border="false">
            <van-cell title="模板名称" :value="doc.templateName || '-'" />
            <van-cell title="发起人" :value="doc.initiatorName || '-'" />
            <van-cell title="当前步骤" :value="doc.status === 'completed' ? '已完成' : `第 ${doc.currentStep || 0} 步`" />
            <van-cell title="创建时间" :value="formatDate(doc.createdAt)" />
            <van-cell title="更新时间" :value="formatDate(doc.updatedAt)" />
          </van-cell-group>
        </div>

        <div class="m-card">
          <div class="section-title">步骤进度</div>
          <van-steps :active="activeStepIndex" direction="vertical" :active-icon="'success'">
            <van-step v-for="s in steps" :key="s.order">
              <h3>{{ s.label }}</h3>
              <p class="muted">{{ stepStatusText(s.instance?.status || 'pending') }}</p>
            </van-step>
          </van-steps>
        </div>

        <div class="m-card" v-if="filledFieldBlocks.length > 0">
          <div class="section-title">填写内容</div>
          <RecursiveFieldBlock
            v-for="block in filledFieldBlocks"
            :key="block.key || block.label"
            :block="block"
            mode="detail"
            :show-signed-badge="false"
          />
        </div>

        <div class="action-bar">
          <van-button
            v-if="doc.status === 'in_progress'"
            block type="primary"
            @click="goFill"
          >
            去填写
          </van-button>
          <van-button
            block plain
            @click="viewPDF"
            style="margin-top: 10px;"
          >
            查看 PDF
          </van-button>
          <van-button
            block plain
            @click="showActions"
            style="margin-top: 10px;"
          >
            更多操作
          </van-button>
        </div>

        <van-action-sheet
          v-model:show="actionSheetVisible"
          :actions="actionItems"
          cancel-text="取消"
          close-on-click-action
          @select="onActionSelect"
        />
      </template>
    </van-skeleton>
  </div>
</template>

<style scoped>
.doc-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.doc-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--srs-text-primary);
  flex: 1;
  min-width: 0;
}
.doc-number {
  font-size: 12px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
  margin-bottom: 12px;
}

.action-bar {
  padding: 16px 0;
  margin-bottom: 60px;
}
</style>