<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { documentAPI, directoryAPI } from '@/api'

const router = useRouter()
const documents = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const activeTab = ref('all')
const loading = ref(false)

const initiatorId = ref('')
const initiatorOptions = ref<{ id: string; name: string }[]>([])
const dateRange = ref<[string, string] | null>(null)
const timeField = ref<'updatedAt' | 'createdAt'>('updatedAt')

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'in_progress', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'terminated', label: '已终止' },
  { key: 'withdrawn', label: '已撤回' },
]

async function loadList() {
  loading.value = true
  try {
    const params: any = {
      keyword: keyword.value || undefined,
      initiatorId: initiatorId.value || undefined,
      timeField: timeField.value,
      page: page.value,
      pageSize: pageSize.value,
    }
    if (activeTab.value !== 'all') {
      params.status = activeTab.value
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startTime = dateRange.value[0]
      params.endTime = dateRange.value[1]
    }
    const res: any = await documentAPI.list(params)
    documents.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {   } finally {
    loading.value = false
  }
}
onMounted(loadList)

function handleSearch() { page.value = 1; loadList() }

function onTabChange() { page.value = 1; loadList() }

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(keyword, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => handleSearch(), 300)
})
onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

async function searchInitiators(query: string) {
  try {
    const res: any = await directoryAPI.users({ keyword: query || undefined })
    initiatorOptions.value = (res.data || []).map((u: any) => ({ id: u.id, name: u.name }))
  } catch {
    initiatorOptions.value = []
  }
}

function goFill(doc: any) {
  router.push(`/documents/${doc.id}/fill`)
}

function goDetail(doc: any) {
  router.push(`/documents/${doc.id}`)
}

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

function getKeyFields(doc: any): any[] {
  try {
    const snapshot = doc.snapshot
    if (!snapshot?.fields) return []
    return snapshot.fields.filter((f: any) => f.isKey)
  } catch { return [] }
}

function formatFieldValue(val: any): string {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'boolean') return val ? '是' : '否'
  return String(val)
}

function formatDate(v: string | number) {
  if (!v) return ''
  return new Date(v).toLocaleString('zh-CN')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">我的文档</h2>
    </div>

    <el-card shadow="never" class="content-card">
      <div class="toolbar">
        <el-form :inline="true" @keyup.enter="handleSearch">
          <el-form-item>
            <el-input
              v-model="keyword"
              placeholder="搜索文档编号/标题/发起人/模板"
              clearable
              style="width: 280px"
              @clear="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
          </el-form-item>
          <el-form-item label="发起人">
            <el-select
              v-model="initiatorId"
              placeholder="按发起人筛选"
              clearable
              filterable
              remote
              :remote-method="searchInitiators"
              style="width: 180px"
              @change="handleSearch"
              @clear="handleSearch"
              @focus="searchInitiators('')"
            >
              <el-option v-for="u in initiatorOptions" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 240px"
              @change="handleSearch"
            />
          </el-form-item>
          <el-form-item>
            <el-radio-group v-model="timeField" @change="handleSearch">
              <el-radio-button value="updatedAt">按更新时间</el-radio-button>
              <el-radio-button value="createdAt">按创建时间</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>

      <el-tabs v-model="activeTab" class="doc-tabs" @tab-change="onTabChange">
        <el-tab-pane v-for="tab in tabs" :key="tab.key" :label="tab.label" :name="tab.key" />
      </el-tabs>

      <el-table v-loading="loading" :data="documents" stripe style="width: 100%">
        <el-table-column prop="docNumber" label="文档编号" width="180" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column label="关键信息" min-width="240">
          <template #default="{ row }">
            <div class="key-fields-row">
              <template v-if="getKeyFields(row).length > 0">
                <span v-for="(kf, ki) in getKeyFields(row)" :key="ki" class="key-field-item">
                  <span class="key-field-label">{{ kf.label }}：</span>
                  <span class="key-field-value">{{ formatFieldValue(row.fieldValues?.[kf.key]) }}</span>
                  <span v-if="ki < getKeyFields(row).length - 1" class="key-field-sep">|</span>
                </span>
              </template>
              <span v-else class="key-field-empty">-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap(row.status).type" size="small" effect="plain">
              {{ statusMap(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前步骤" width="80" align="center">
          <template #default="{ row }">
            <span>{{ row.currentStep || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="initiatorName" label="发起人" width="110">
          <template #default="{ row }">
            <span>{{ row.initiatorName || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="最后更新" width="170">
          <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'in_progress'" type="primary" link size="small" @click="goFill(row)">去填写</el-button>
            <el-button type="primary" link size="small" @click="goDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          background
          @current-change="loadList"
        />
      </div>
    </el-card>
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

.content-card {
  border-radius: var(--srs-radius-lg);
  border: 1px solid var(--srs-border);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.key-fields-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
}

.key-field-item {
  font-size: 13px;
  line-height: 1.5;
  white-space: nowrap;
}

.key-field-label {
  color: var(--srs-text-tertiary);
}

.key-field-value {
  color: var(--srs-text-primary);
  font-weight: 500;
}

.key-field-sep {
  color: #d1d5db;
  margin-left: 8px;
}

.key-field-empty {
  color: var(--srs-text-placeholder);
}
</style>