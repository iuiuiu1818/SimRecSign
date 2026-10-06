<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { notificationAPI } from '@/api'
import { showToast } from 'vant'
import { BaseIcon, IconEmpty } from '@/components'

const router = useRouter()

const list = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const pageSize = 20

async function loadList(reset = false) {
  if (reset) { page.value = 1; finished.value = false }
  if (finished.value && !reset) return
  loading.value = true
  try {
    const res: any = await notificationAPI.list({ page: page.value, pageSize })
    const items = res.data?.list || []
    total.value = res.data?.total || 0
    list.value = reset ? items : [...list.value, ...items]
    finished.value = list.value.length >= total.value
    page.value += 1
  } catch {   } finally {
    loading.value = false
  }
}

onMounted(() => loadList(true))

function onLoad() { loadList() }

async function markRead(item: any) {
  if (item.isRead) return
  try {
    await notificationAPI.markRead(item.id)
    item.isRead = true
  } catch {   }
}

async function handleClick(item: any) {
  if (!item.isRead) {
    try {
      await notificationAPI.markRead(item.id)
      item.isRead = true
    } catch {   }
  }
  if (item.targetType === 'document' && item.targetId) {
    router.push(`/documents/${item.targetId}`)
  }
}

async function markAllRead() {
  try {
    await notificationAPI.markAllRead()
    list.value.forEach((item: any) => { item.isRead = true })
    showToast('已全部标记已读')
  } catch {   }
}

function typeIcon(type: string) {
  const m: Record<string, string> = {
    step_arrived: 'notification',
    step_returned: 'undo',
    doc_rejected: 'error',
    doc_completed: 'check',
    doc_withdrawn: 'undo',
    handoff_bound: 'link',
    handoff_revoked: 'link',
  }
  return m[type] || 'info'
}

function typeColor(type: string) {
  const m: Record<string, string> = {
    step_arrived: 'var(--srs-primary)',
    step_returned: 'var(--srs-warning)',
    doc_rejected: 'var(--srs-danger)',
    doc_completed: 'var(--srs-success)',
    doc_withdrawn: 'var(--srs-text-tertiary)',
    handoff_bound: 'var(--srs-accent-violet)',
    handoff_revoked: 'var(--srs-text-tertiary)',
  }
  return m[type] || 'var(--srs-info)'
}
</script>

<template>
  <div class="notif-page">
    <div class="notif-header">
      <span class="notif-count" v-if="total">共 {{ total }} 条</span>
      <van-button size="small" plain @click="markAllRead">全部已读</van-button>
    </div>

    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text="没有更多了"
      @load="onLoad"
    >
      <van-swipe-cell v-for="item in list" :key="item.id">
        <van-cell
          :title="item.title"
          :label="item.content"
          :class="{ 'notif-unread': !item.isRead }"
          @click="handleClick(item)"
        >
          <template #icon>
            <div class="notif-icon-wrap" :class="{ 'notif-icon-unread': !item.isRead }">
              <BaseIcon
                :name="typeIcon(item.type)"
                :color="item.isRead ? 'var(--srs-text-tertiary)' : typeColor(item.type)"
                :size="20"
                class="notif-icon"
              />
            </div>
          </template>
          <template #extra>
            <span class="notif-time muted">{{ item.createdAt ? new Date(item.createdAt).toLocaleString() : '' }}</span>
          </template>
        </van-cell>
        <template #right>
          <van-button square type="danger" text="标记已读" @click.stop="markRead(item)" />
        </template>
      </van-swipe-cell>
    </van-list>

    <div v-if="!loading && list.length === 0" class="empty">
      <van-empty description="暂无通知">
        <template #image>
          <IconEmpty :size="100" />
        </template>
      </van-empty>
    </div>
  </div>
</template>

<style scoped>
.notif-page {
  background: var(--srs-bg-page);
}

.notif-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.notif-count {
  font-size: 13px;
  color: var(--srs-text-tertiary);
}

.notif-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  flex-shrink: 0;
}

.notif-icon-unread {
  background: var(--srs-primary-bg);
}

.notif-icon {
  display: flex;
  align-items: center;
  height: 100%;
}

.notif-unread {
  --van-cell-background: var(--srs-primary-bg);
}

.notif-time {
  font-size: 11px;
  white-space: nowrap;
}

.empty {
  padding: 30px 0;
}
</style>