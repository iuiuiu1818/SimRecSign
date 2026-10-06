<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import http from '@/api'

interface Cert {
  id: string
  userId: string
  userName: string
  subject: string
  issuer: string
  serialNumber: string
  validFrom: string
  validTo: string
  status: 'active' | 'expired' | 'revoked'
}

const allCerts = ref<Cert[]>([])
const loading = ref(false)
const detailVisible = ref(false)
const detailCert = ref<Cert | null>(null)

const page = ref(1)
const pageSize = ref(15)

const keyword = ref('')

const filteredCerts = computed(() => {
  if (!keyword.value.trim()) return allCerts.value
  const kw = keyword.value.trim().toLowerCase()
  return allCerts.value.filter(c =>
    c.userName?.toLowerCase().includes(kw) ||
    c.subject?.toLowerCase().includes(kw) ||
    c.issuer?.toLowerCase().includes(kw) ||
    c.serialNumber?.toLowerCase().includes(kw)
  )
})

const pagedCerts = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredCerts.value.slice(start, start + pageSize.value)
})

const total = computed(() => filteredCerts.value.length)

function handleSearch() {
  page.value = 1
}

async function loadCerts() {
  loading.value = true
  try {
    const res: any = await http.get('/admin/certificates')
    allCerts.value = res.data || []
  } catch {   }
  finally { loading.value = false }
}

function statusTag(status: string) {
  const m: Record<string, { label: string; type: string }> = {
    active: { label: '有效', type: 'success' },
    expired: { label: '已过期', type: 'danger' },
    revoked: { label: '已吊销', type: 'info' },
  }
  return m[status] || { label: status, type: 'info' }
}

function handleView(cert: Cert) {
  detailCert.value = cert
  detailVisible.value = true
}

onMounted(loadCerts)
</script>

<template>
  <div class="cert-admin-page">

    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">证书管理</h1>
        <span class="page-desc">全租户证书状态监控</span>
      </div>
      <div class="page-header-right">
        <el-input
          v-model="keyword"
          placeholder="搜索用户/主体/签发者/序列号"
          clearable
          style="width: 300px"
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <el-card class="content-card" shadow="never">
      <el-table
        :data="pagedCerts"
        v-loading="loading"
        stripe
        style="width: 100%"
        @row-dblclick="handleView"
      >
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column prop="userName" label="所属用户" width="120" />
        <el-table-column prop="subject" label="证书主体" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="cell-mono">{{ row.subject }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="issuer" label="签发者" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="cell-mono">{{ row.issuer }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="serialNumber" label="序列号" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="cell-mono cell-sn">{{ row.serialNumber }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="validFrom" label="有效期起" width="110" align="center" />
        <el-table-column prop="validTo" label="有效期止" width="110" align="center" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status).type" size="small" effect="light">
              {{ statusTag(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">详情</el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty
            v-if="!loading"
            :description="keyword ? '未找到匹配的证书' : '暂无证书数据'"
            :image-size="80"
          />
        </template>
      </el-table>

      <div v-if="total > 0" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 15, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          small
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="证书详情" width="560px" :close-on-click-modal="false">
      <el-descriptions v-if="detailCert" :column="1" border>
        <el-descriptions-item label="所属用户" min-width="100">
          <el-tag size="small">{{ detailCert.userName }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="证书主体">
          <span class="cell-mono">{{ detailCert.subject }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="签发者">
          <span class="cell-mono">{{ detailCert.issuer }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="序列号">
          <span class="cell-mono cell-sn">{{ detailCert.serialNumber }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="有效期起">{{ detailCert.validFrom }}</el-descriptions-item>
        <el-descriptions-item label="有效期止">{{ detailCert.validTo }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTag(detailCert.status).type" size="small" effect="light">
            {{ statusTag(detailCert.status).label }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.cert-admin-page {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--srs-space-lg, 24px);
}

.page-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--srs-text-primary, #0f172a);
  margin: 0;
  line-height: 1.4;
}

.page-desc {
  font-size: 13px;
  color: var(--srs-text-tertiary, #94a3b8);
  padding-top: 4px;
  align-self: flex-end;
}

.content-card {
  border-radius: var(--srs-radius-lg, 12px);
  border: 1px solid var(--srs-border, #e8ecf1);
}

.cell-mono {
  font-family: var(--srs-font-mono, 'SF Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace);
  font-size: 12px;
}

.cell-sn {
  font-size: 11px;
  letter-spacing: 0.3px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 4px;
}
</style>