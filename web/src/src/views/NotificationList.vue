<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { notificationAPI } from '@/api'
import { ElMessage } from 'element-plus'

const notifications = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const unreadCount = ref(0)
const filter = ref<'all' | 'unread'>('all')

async function loadList() {
  try {
    const isRead = filter.value === 'unread' ? false : undefined
    const res: any = await notificationAPI.list({ isRead, page: page.value, pageSize: pageSize.value })
    notifications.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {   }
}

async function loadUnreadCount() {
  try {
    const res: any = await notificationAPI.unreadCount()
    unreadCount.value = res.data?.count || 0
  } catch {   }
}

function handleFilterChange(val: 'all' | 'unread') {
  filter.value = val
  page.value = 1
  loadList()
}

async function handleMarkRead(notif: any) {
  if (notif.isRead) return
  try {
    await notificationAPI.markRead(notif.id)
    notif.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch {   }
}

async function handleMarkAllRead() {
  if (unreadCount.value === 0) {
    ElMessage.info('没有未读通知')
    return
  }
  try {
    await notificationAPI.markAllRead()
    ElMessage.success('已全部标为已读')
    unreadCount.value = 0
    loadList()
  } catch {   }
}

function typeLabel(type: string) {
  const m: Record<string, string> = {
    step_arrived: '流程到达',
    step_returned: '被退回',
    doc_rejected: '被驳回',
    doc_completed: '流程完成',
    doc_withdrawn: '被撤回',
    handoff_bound: '链接已交接',
    handoff_revoked: '链接作废',
  }
  return m[type] || type
}

function typeTag(type: string) {
  const m: Record<string, string> = {
    step_arrived: 'warning',
    step_returned: 'danger',
    doc_rejected: 'danger',
    doc_completed: 'success',
    doc_withdrawn: 'info',
    handoff_bound: '',
    handoff_revoked: 'info',
  }
  return m[type] || 'info'
}

function formatTime(t: string) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(() => {
  loadList()
  loadUnreadCount()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">
        通知中心
        <el-badge v-if="unreadCount > 0" :value="unreadCount" class="page-badge" />
      </h2>
      <el-button
        v-if="unreadCount > 0"
        type="primary"
        size="small"
        @click="handleMarkAllRead"
      >
        全部已读
      </el-button>
    </div>

    <el-card shadow="never" class="content-card">
      <div class="toolbar">
        <el-radio-group v-model="filter" @change="handleFilterChange">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="unread">未读</el-radio-button>
        </el-radio-group>
      </div>

      <el-table :data="notifications" stripe v-loading="false" @row-click="handleMarkRead" class="notif-table">
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.type)" size="small" effect="plain">
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <span :style="{ fontWeight: row.isRead ? 'normal' : 'bold' }">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
        <el-table-column label="时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isRead ? 'info' : 'danger'" size="small" effect="light">
              {{ row.isRead ? '已读' : '未读' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="notifications.length === 0" description="暂无通知" />

      <div class="pagination" v-if="total > pageSize">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="loadList"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page-container {
  padding: 0;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--srs-text-primary);
}
.page-badge {
  margin-left: 8px;
}
.toolbar {
  margin-bottom: 16px;
}
.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.notif-table :deep(.el-table__row) {
  cursor: pointer;
}
</style>
