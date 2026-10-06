<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { templateAPI, documentAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { showConfirmDialog, showToast } from 'vant'
import { IconTemplate, IconEmpty, IconFileText, IconCheck, IconChart, IconPlus } from '@/components'

const router = useRouter()
const userStore = useUserStore()

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
  { name: 'published', text: '已发布' },
  { name: 'draft', text: '草稿' },
  { name: 'disabled', text: '已停用' },
]

const iconSet = [
  IconTemplate, IconFileText, IconChart, IconCheck,
]

function getIcon(tplIndex: number) {
  return iconSet[tplIndex % iconSet.length]
}

function getIconColor(s: string) {
  if (s === 'published') return 'var(--srs-primary)'
  if (s === 'draft') return 'var(--srs-accent-amber)'
  return 'var(--srs-text-tertiary)'
}

function getIconBg(s: string) {
  if (s === 'published') return 'var(--srs-primary-bg)'
  if (s === 'draft') return 'var(--srs-accent-amber-bg)'
  return 'var(--srs-bg-hover)'
}

const statusText = (s: string) => {
  if (s === 'published') return '已发布'
  if (s === 'draft') return '草稿'
  if (s === 'disabled') return '已停用'
  return s
}

const filteredList = computed(() => list.value)

async function loadList(reset = false) {
  if (reset) {
    page.value = 1
    finished.value = false
  }
  if (finished.value && !reset) return
  loading.value = true
  try {
    const res: any = await templateAPI.list({
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
    showToast(e?.message || '加载模板列表失败')
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

function canInitiate(tpl: any): boolean {
  if (tpl.status !== 'published') return false
  const scope = tpl.initiateScope
  if (!scope || scope.length === 0) return true
  for (const t of scope) {
    if (t.type === 'org') return true
    if (t.type === 'user' && t.id === userStore.userId) return true
  }
  return false
}

function initiate(tpl: any) {
  showConfirmDialog({
    title: '发起流程',
    message: `将为「${tpl.name}」发起一个新流程？`,
    confirmButtonText: '发起',
    cancelButtonText: '取消',
  }).then(async () => {
    try {
      const res: any = await documentAPI.initiate({ templateId: tpl.id, title: tpl.name })
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
  <div class="template-page">

    <van-search
      v-model="keyword"
      placeholder="搜索模板名称"
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
        loading-text="加载中..."
        @load="onLoad"
      >
        <div class="tpl-list">
          <div
            v-for="(tpl, tplIndex) in filteredList"
            :key="tpl.id"
            class="tpl-card"
          >

            <div class="tpl-card-icon" :style="{ background: getIconBg(tpl.status) }">
              <component :is="getIcon(tplIndex)" :size="22" :color="getIconColor(tpl.status)" />
            </div>

            <div class="tpl-card-info">
              <div class="tpl-card-name">{{ tpl.name }}</div>
              <div class="tpl-card-meta muted">
                {{ tpl.category || '未分类' }} · {{ statusText(tpl.status) }}
              </div>
            </div>

            <van-button
              v-if="canInitiate(tpl)"
              class="tpl-card-btn"
              size="small"
              type="primary"
              plain
              round
              @click.stop="initiate(tpl)"
            >
              <IconPlus :size="14" color="var(--srs-primary)" />
              发起
            </van-button>
          </div>
        </div>
        <div v-if="!loading && list.length === 0" class="empty">
          <van-empty description="暂无模板">
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
.template-page {
  background: var(--srs-bg-page);
}

.status-tabs {
  margin-bottom: 4px;
  --van-tabs-nav-background: var(--srs-bg-card);
}

.tpl-list {
  padding: 0 12px;
}

.tpl-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--srs-bg-card);
  border-radius: var(--srs-radius-lg);
  border: 1px solid var(--srs-border);
  padding: 14px 16px;
  margin-bottom: 10px;
  transition: transform var(--srs-transition-fast) ease;
}

.tpl-card:active {
  transform: scale(0.98);
}

.tpl-card-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tpl-card-info {
  flex: 1;
  min-width: 0;
}

.tpl-card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpl-card-meta {
  font-size: 12px;
  margin-top: 3px;
}

.tpl-card-btn {
  flex-shrink: 0;
}

.page-bottom-space {
  height: 60px;
}

.empty {
  padding: 30px 0;
}
</style>
