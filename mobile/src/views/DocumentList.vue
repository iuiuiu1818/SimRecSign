<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { documentAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { BaseIcon, IconDocument, IconEmpty, IconEmptySearch } from '@/components'
import { statusLabel, statusBadge, formatDate } from '@/utils/documentUtils'

const router = useRouter()

const keyword = ref('')
const status = ref('')
const list = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const pageSize = 15

const statusTabs = [
  { name: '', text: '全部' },
  { name: 'in_progress', text: '进行中' },
  { name: 'completed', text: '已完成' },
  { name: 'terminated', text: '已终止' },
  { name: 'withdrawn', text: '已撤回' },
]

const filteredList = computed(() => list.value)

async function loadList(reset = false) {
  if (reset) {
    page.value = 1
    finished.value = false
  }
  if (finished.value && !reset) return
  loading.value = true
  try {
    const res: any = await documentAPI.list({
      keyword: keyword.value || '',
      status: status.value || '',
      page: page.value,
      pageSize,
    })
    const items = res.data?.list || []
    total.value = res.data?.total || 0
    list.value = reset ? items : [...list.value, ...items]
    finished.value = list.value.length >= total.value
    page.value += 1
  } catch (e: any) {
    showToast(e?.message || '加载文档列表失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

onMounted(() => loadList(true))

function onRefresh() { loadList(true) }
function onSearch() { loadList(true) }
function onStatusChange() { loadList(true) }
function onLoad() { loadList() }

function cardBorderColor(s: string) {
  if (s === 'in_progress') return 'var(--srs-warning)'
  if (s === 'completed') return 'var(--srs-success)'
  if (s === 'terminated') return 'var(--srs-danger)'
  if (s === 'withdrawn') return 'var(--srs-text-tertiary)'
  return 'var(--srs-primary)'
}

function getKeyFields(doc: any): string {
  if (!doc.snapshot?.fields) return ''
  const keys = doc.snapshot.fields.filter((f: any) => f.isKey).slice(0, 3)
  return keys.map((f: any) => {
    const v = doc.fieldValues?.[f.key]
    if (v === undefined || v === null) return ''
    if (typeof v === 'boolean') return v ? '是' : '否'
    return String(v)
  }).filter(Boolean).join(' · ')
}
</script>

<template>
  <div class="doc-page">
    <van-search
      v-model="keyword"
      placeholder="搜索文档编号或标题"
      @search="onSearch"
      @clear="onSearch"
    />

    <van-tabs v-model:active="status" @change="onStatusChange" shrink class="status-tabs">
      <van-tab v-for="t in statusTabs" :key="t.name" :name="t.name" :title="t.text" />
    </van-tabs>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div class="doc-list">
          <div
            v-for="doc in filteredList"
            :key="doc.id"
            class="doc-card"
            :class="'doc-card-' + doc.status"
            @click="router.push(doc.status === 'in_progress' ? `/documents/${doc.id}/fill` : `/documents/${doc.id}`)"
          >
            <div class="doc-card-top">
              <div class="doc-card-left">
                <div class="doc-card-icon" :class="'doc-icon-' + doc.status">
                  <IconDocument :size="18" :color="cardBorderColor(doc.status)" />
                </div>
                <span class="doc-card-title">{{ doc.title || '未命名文档' }}</span>
              </div>
              <span class="status-badge" :class="statusBadge(doc.status)">{{ statusLabel(doc.status) }}</span>
            </div>
            <div class="doc-card-number muted mono">{{ doc.docNumber }}</div>
            <div class="doc-card-meta">
              <span v-if="getKeyFields(doc)" class="doc-card-keys">{{ getKeyFields(doc) }}</span>
              <span class="muted">{{ doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '' }}</span>
            </div>
          </div>
        </div>
        <div v-if="!loading && list.length === 0" class="empty">
          <van-empty description="暂无文档">
            <template #image>
              <IconEmpty :size="100" />
            </template>
          </van-empty>
        </div>
      </van-list>
    </van-pull-refresh>

    <div class="page-bottom-space"></div>
  </div>
</template>

<style scoped>
.doc-page {
  background: var(--srs-bg-page);
}

.status-tabs {
  margin-bottom: 4px;
  --van-tabs-nav-background: var(--srs-bg-card);
}

.doc-list {
  padding: 0 12px;
}

.doc-card {
  background: var(--srs-bg-card);
  border-radius: var(--srs-radius-lg);
  border: 1px solid var(--srs-border);
  padding: 14px 16px;
  margin-bottom: 10px;
  cursor: pointer;
  position: relative;
  transition: transform var(--srs-transition-fast) ease, box-shadow var(--srs-transition-fast) ease;
}

.doc-card:active {
  transform: scale(0.98);
}

.doc-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 3px 3px 0;
}

.doc-card-in_progress::before { background: var(--srs-warning); }
.doc-card-completed::before { background: var(--srs-success); }
.doc-card-terminated::before { background: var(--srs-danger); }
.doc-card-withdrawn::before { background: var(--srs-text-tertiary); }
.doc-card-draft::before { background: var(--srs-primary); }

.doc-card-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.doc-card-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.doc-icon-in_progress { background: var(--srs-warning-bg); }
.doc-icon-completed { background: var(--srs-success-bg); }
.doc-icon-terminated { background: var(--srs-danger-bg); }
.doc-icon-withdrawn { background: var(--srs-info-bg); }
.doc-icon-draft { background: var(--srs-primary-bg); }

.doc-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.doc-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-card-number {
  font-size: 12px;
  margin-bottom: 6px;
}

.doc-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.doc-card-keys {
  color: var(--srs-text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-bottom-space {
  height: 60px;
}

.empty {
  padding: 30px 0;
}
</style>