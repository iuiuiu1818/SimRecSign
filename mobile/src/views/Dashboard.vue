<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { templateAPI, documentAPI } from '@/api'
import { showConfirmDialog, showToast } from 'vant'
import { useUserStore } from '@/stores/user'
import {
  IconDocument, IconFileText, IconBell, IconUser,
  IconArrowRight, IconEmpty,
  IconClock, IconInbox, IconCheckCircle,
  IconZap, IconSend, IconCalendar, IconLayoutGrid, IconTemplate,
} from '@/components'

const router = useRouter()
const userStore = useUserStore()

const stat = ref({ pending: 0, completed: 0, myDocs: 0 })
const templates = ref<any[]>([])
const loading = ref(true)

const quickTemplates = computed(() => templates.value.filter((t: any) => t.status === 'published').slice(0, 6))

const now = new Date()
const hour = now.getHours()
const greeting = hour < 5 ? '夜深了'
  : hour < 11 ? '早上好'
  : hour < 13 ? '中午好'
  : hour < 18 ? '下午好'
  : '晚上好'
const weekCN = ['日', '一', '二', '三', '四', '五', '六']
const dateText = `${now.getMonth() + 1}月${now.getDate()}日 星期${weekCN[now.getDay()]}`
const greetText = computed(() => {
  const name = userStore.userName
  return name ? `${greeting}，${name}` : greeting
})

onMounted(async () => {
  try {
    const [tplRes, docRes]: any = await Promise.all([
      templateAPI.list({ pageSize: 10 }),
      documentAPI.list({ pageSize: 1, status: 'in_progress' }),
    ])
    templates.value = tplRes.data?.list || []

    const pendingCount = docRes.data?.total || 0
    let completedCount = 0
    let myDocsCount = 0
    try {
      const [compRes, allRes]: any = await Promise.all([
        documentAPI.list({ pageSize: 1, status: 'completed' }),
        documentAPI.list({ pageSize: 1 }),
      ])
      completedCount = compRes.data?.total || 0
      myDocsCount = allRes.data?.total || 0
    } catch {   }
    stat.value.pending = pendingCount
    stat.value.completed = completedCount
    stat.value.myDocs = myDocsCount
  } catch (e: any) {
    showToast('加载首页数据失败')
  } finally {
    loading.value = false
  }
})

async function initiateTemplate(tpl: any) {
  const title = tpl.name
  showConfirmDialog({
    title: '发起流程',
    message: `将为「${title}」发起一个新流程？`,
    confirmButtonText: '发起',
    cancelButtonText: '取消',
  }).then(async () => {
    try {
      const res: any = await documentAPI.initiate({ templateId: tpl.id, title })
      const docId = res.data?.id
      showToast('发起成功')
      router.push(`/documents/${docId}/fill`)
    } catch (e: any) {
      showToast(e?.message || '发起失败')
    }
  }).catch(() => {})
}
</script>

<template>
  <div class="page-container dashboard-page">
    <van-skeleton :loading="loading" :row="6" :title="false" />
    <template v-if="!loading">

      <div class="greet-row">
        <div class="greet-hello">{{ greetText }}</div>
        <div class="greet-date">
          <IconCalendar :size="12" color="var(--srs-text-tertiary)" />
          {{ dateText }}
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-main" @click="router.push('/documents')">
          <div class="stat-num" :class="{ 'stat-num-active': stat.pending > 0 }">{{ stat.pending }}</div>
          <div class="stat-label">
            <IconClock :size="12" color="var(--srs-warning)" />
            <span>待处理</span>
          </div>
        </div>
        <div class="stat-side">
          <div class="stat-cell" @click="router.push('/documents')">
            <div class="stat-cell-num">{{ stat.myDocs }}</div>
            <div class="stat-label">
              <IconInbox :size="12" color="var(--srs-primary)" />
              <span>我的文档</span>
            </div>
          </div>
          <div class="stat-cell" @click="router.push('/documents')">
            <div class="stat-cell-num">{{ stat.completed }}</div>
            <div class="stat-label">
              <IconCheckCircle :size="12" color="var(--srs-success)" />
              <span>已完成</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section-head">
        <span class="section-title">
          <IconLayoutGrid :size="14" color="var(--srs-primary)" />
          常用功能
        </span>
      </div>
      <div class="func-row">
        <div class="func-item" @click="router.push('/templates')">
          <IconFileText :size="22" color="var(--srs-primary)" />
          <span class="func-label">模板库</span>
        </div>
        <div class="func-item" @click="router.push('/documents')">
          <IconDocument :size="22" color="var(--srs-accent-cyan)" />
          <span class="func-label">我的文档</span>
        </div>
        <div class="func-item" @click="router.push('/notifications')">
          <IconBell :size="22" color="var(--srs-accent-violet)" />
          <span class="func-label">通知中心</span>
        </div>
        <div class="func-item" @click="router.push('/settings/profile')">
          <IconUser :size="22" color="var(--srs-accent-amber)" />
          <span class="func-label">个人设置</span>
        </div>
      </div>

      <div class="section-head">
        <span class="section-title">
          <IconZap :size="14" color="var(--srs-accent-amber)" />
          快捷发起
        </span>
        <span class="section-more" @click="router.push('/templates')">
          全部模板 <IconArrowRight :size="12" color="var(--srs-text-tertiary)" />
        </span>
      </div>
      <div v-if="quickTemplates.length > 0" class="tpl-list">
        <div
          v-for="tpl in quickTemplates"
          :key="tpl.id"
          class="tpl-row"
          @click="initiateTemplate(tpl)"
        >
          <IconTemplate :size="18" color="var(--srs-primary)" class="tpl-icon" />
          <div class="tpl-info">
            <div class="tpl-name">{{ tpl.name }}</div>
            <div class="tpl-cat">{{ tpl.category || '未分类' }}</div>
          </div>
          <span class="tpl-go">
            <IconSend :size="12" color="var(--srs-text-inverse)" />
            发起
          </span>
        </div>
      </div>
      <div v-else class="tpl-list tpl-list-empty">
        <van-empty description="暂无已发布模板，可先到模板库创建">
          <template #image>
            <IconEmpty :size="90" />
          </template>
        </van-empty>
      </div>
    </template>
  </div>
</template>

<style scoped>

.greet-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 2px 2px 14px;
}

.greet-hello {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: var(--srs-text-primary);
}

.greet-date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--srs-text-tertiary);
}

.stat-card {
  display: flex;
  align-items: stretch;
  background: var(--srs-bg-card);
  border: 1px solid var(--srs-border);
  border-radius: var(--srs-radius-lg);
  overflow: hidden;
}

.stat-main {
  flex: 1.15;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 18px 16px;
}

.stat-num {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--srs-text-primary);
  font-variant-numeric: tabular-nums;
}

.stat-num-active {
  color: var(--srs-primary);
}

.stat-label {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--srs-text-tertiary);
}

.stat-side {
  flex: 1.6;
  display: flex;
  border-left: 1px solid var(--srs-border-light);
}

.stat-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 18px 12px 18px 16px;
}

.stat-cell + .stat-cell {
  border-left: 1px solid var(--srs-border-light);
}

.stat-cell-num {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--srs-text-primary);
  font-variant-numeric: tabular-nums;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 2px 10px;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
}

.section-more {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: var(--srs-text-tertiary);
}

.section-more:active {
  color: var(--srs-text-secondary);
}

.func-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.func-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 10px 0 8px;
  border-radius: var(--srs-radius-md);
}

.func-label {
  font-size: 12px;
  color: var(--srs-text-secondary);
}

.tpl-list {
  background: var(--srs-bg-card);
  border: 1px solid var(--srs-border);
  border-radius: var(--srs-radius-lg);
  overflow: hidden;
}

.tpl-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
}

.tpl-row + .tpl-row {
  border-top: 1px solid var(--srs-border-light);
}

.tpl-icon {
  flex-shrink: 0;
}

.tpl-info {
  flex: 1;
  min-width: 0;
}

.tpl-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--srs-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpl-cat {
  margin-top: 2px;
  font-size: 12px;
  color: var(--srs-text-tertiary);
}

.tpl-go {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  padding: 5px 13px;
  border-radius: 999px;
  background: var(--srs-primary);
  color: var(--srs-text-inverse);
  font-size: 12px;
  line-height: 1;
}

.tpl-list-empty {
  padding: 8px 0;
}

.stat-main:active,
.stat-cell:active,
.func-item:active,
.tpl-row:active {
  background: var(--srs-bg-hover);
}

.tpl-row:active .tpl-go {
  opacity: 0.75;
}
</style>
