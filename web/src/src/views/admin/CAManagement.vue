<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { caAPI } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

interface CAInfo {
  id: string
  tenantId: string
  subject: string
  serialNumber: string
  notBefore: string
  notAfter: string
  status: string
  issuedCount: number
  revokedCount: number
}
const caInfo = ref<CAInfo | null>(null)
const caLoading = ref(false)
const initing = ref(false)

interface IssuedCert {
  id: string
  userId: string
  userName: string
  serialNumber: string
  subject: string
  notBefore: string
  notAfter: string
  status: 'active' | 'expired' | 'revoked'
  revokedAt: number | null
}
const allCerts = ref<IssuedCert[]>([])
const certsLoading = ref(false)

const page = ref(1)
const pageSize = ref(15)
const pagedCerts = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return allCerts.value.slice(start, start + pageSize.value)
})
const total = computed(() => allCerts.value.length)

const keyword = ref('')
const filteredCerts = computed(() => {
  if (!keyword.value.trim()) return allCerts.value
  const kw = keyword.value.trim().toLowerCase()
  return allCerts.value.filter(c =>
    c.userName?.toLowerCase().includes(kw) ||
    c.serialNumber?.toLowerCase().includes(kw) ||
    c.subject?.toLowerCase().includes(kw)
  )
})
const pagedFiltered = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredCerts.value.slice(start, start + pageSize.value)
})
const totalFiltered = computed(() => filteredCerts.value.length)

interface ApplicationItem {
  id: string
  userId: string
  userName: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  rejectReason?: string
  createdAt: string
  approvedAt?: number | null
}
const applications = ref<ApplicationItem[]>([])
const appsLoading = ref(false)
const applyStatusFilter = ref('')
const apprLoading = ref(false)

const rejectDialogVisible = ref(false)
const rejectReason = ref('')
const rejectTarget = ref<ApplicationItem | null>(null)
const revoking = ref(false)

function statusTag(status: string) {
  const m: Record<string, { label: string; type: string }> = {
    active: { label: '有效', type: 'success' },
    expired: { label: '已过期', type: 'danger' },
    revoked: { label: '已吊销', type: 'info' },
  }
  return m[status] || { label: status, type: 'info' }
}

async function loadCAInfo() {
  caLoading.value = true
  try {
    const res: any = await caAPI.getInfo()
    caInfo.value = res.data
  } catch {
    caInfo.value = null
  } finally {
    caLoading.value = false
  }
}

async function loadCerts() {
  certsLoading.value = true
  try {
    const res: any = await caAPI.listCertificates()
    allCerts.value = res.data || []
  } catch {   }
  finally { certsLoading.value = false }
}

async function loadApplications() {
  appsLoading.value = true
  try {
    const res: any = await caAPI.listApplications(applyStatusFilter.value)
    applications.value = res.data || []
  } catch { applications.value = [] }
  finally { appsLoading.value = false }
}

async function handleApprove(app: ApplicationItem) {
  try {
    await ElMessageBox.confirm(
      `确定要通过用户 "${app.userName}" 的证书申请并签发证书吗？\n证书签发后该用户即可用于文档签署。`,
      '确认通过',
      { confirmButtonText: '确认签发', cancelButtonText: '取消', type: 'info' }
    )
  } catch { return }

  apprLoading.value = true
  try {
    await caAPI.approveApplication(app.id)
    ElMessage.success('证书签发成功')
    await loadApplications()
    await loadCerts()
  } catch {   }
  finally { apprLoading.value = false }
}

function openRejectDialog(app: ApplicationItem) {
  rejectTarget.value = app
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

async function handleReject() {
  if (!rejectTarget.value || !rejectReason.value.trim()) return
  apprLoading.value = true
  try {
    await caAPI.rejectApplication(rejectTarget.value.id, rejectReason.value.trim())
    ElMessage.success('已拒绝')
    rejectDialogVisible.value = false
    await loadApplications()
  } catch {   }
  finally { apprLoading.value = false }
}

async function handleInitCA() {
  try {
    await ElMessageBox.confirm(
      '确定要初始化平台 CA 吗？' +
      '\n• 将生成 RSA 4096 密钥对和自签名根证书' +
      '\n• 私钥将加密存储到文件系统' +
      '\n• 每个租户仅可初始化一次，此操作不可逆',
      '确认初始化 CA',
      { confirmButtonText: '确认初始化', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }

  initing.value = true
  try {
    await caAPI.init()
    ElMessage.success('CA 初始化成功')
    await loadCAInfo()
    await loadCerts()
  } catch {   }
  finally { initing.value = false }
}

async function handleRevoke(cert: IssuedCert) {
  try {
    await ElMessageBox.confirm(
      `确定要吊销用户 "${cert.userName}" 的证书吗？\n吊销后该证书将不可用于签署。`,
      '确认吊销',
      { confirmButtonText: '确认吊销', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }

  revoking.value = true
  try {
    await caAPI.revokeCert(cert.id)
    ElMessage.success('证书已吊销')
    await loadCerts()
    if (cert.userId === userStore.userId) {
      userStore.hasCaCertificate = false
      localStorage.setItem('hasCaCertificate', 'false')
    }
  } catch {   }
  finally { revoking.value = false }
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function isExpired(dateStr: string): boolean {
  return dateStr ? new Date(dateStr) < new Date() : false
}

async function downloadCACert() {
  try {
    await caAPI.downloadCACert()
  } catch {   }
}

async function downloadCRL() {
  try {
    await caAPI.downloadCRL()
  } catch {   }
}

onMounted(() => {
  loadCAInfo()
  loadCerts()
  loadApplications()
})
</script>

<template>
  <div class="ca-page">

    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">自建 CA</h1>
        <span class="page-desc">平台证书签发与管理</span>
      </div>
    </div>

    <el-card shadow="never" class="content-card" v-loading="caLoading">
      <template #header>
        <div class="card-header-row">
          <span class="card-title">CA 根证书</span>
          <div v-if="caInfo">
            <el-tag :type="caInfo.status === 'active' ? 'success' : 'danger'" effect="light" size="small">
              {{ caInfo.status === 'active' ? '运行中' : caInfo.status }}
            </el-tag>
          </div>
          <div v-else>
            <el-tag type="info" effect="light" size="small">未初始化</el-tag>
          </div>
        </div>
      </template>

      <div v-if="caLoading" class="loading-placeholder">
        <el-skeleton :rows="4" animated />
      </div>

      <div v-else-if="!caInfo" class="empty-state">
        <el-empty description="尚未初始化平台 CA" :image-size="80">
          <template #description>
            <p class="empty-desc">初始化后可为用户签发 RSA 数字证书，用于文档签署。</p>
          </template>
          <el-button type="primary" :loading="initing" @click="handleInitCA">
            初始化 CA
          </el-button>
        </el-empty>
      </div>

      <div v-else>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-statistic title="已签发" :value="caInfo.issuedCount" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="已吊销" :value="caInfo.revokedCount" />
          </el-col>
          <el-col :span="8">
            <el-statistic
              title="有效期至"
              :value="fmtDate(caInfo.notAfter)"
              :value-style="isExpired(caInfo.notAfter) ? { color: 'var(--el-color-danger)' } : {}"
            />
          </el-col>
        </el-row>

        <el-divider />

        <el-descriptions :column="2" size="small" border>
          <el-descriptions-item label="主题（Subject）" :span="2">
            <span class="cell-mono">{{ caInfo.subject }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="序列号">
            <span class="cell-mono cell-sn">{{ caInfo.serialNumber }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="caInfo.status === 'active' ? 'success' : 'danger'" size="small" effect="light">
              {{ caInfo.status === 'active' ? '运行中' : caInfo.status }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="action-bar">
          <el-button size="small" @click="downloadCACert()">
            下载 CA 证书
          </el-button>
          <el-button size="small" @click="downloadCRL()">
            下载 CRL
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="content-card" style="margin-top: 20px">
      <template #header>
        <div class="card-header-row">
          <span class="card-title">证书申请审批</span>
          <el-select v-model="applyStatusFilter" placeholder="状态筛选" size="small" style="width: 120px" @change="loadApplications">
            <el-option label="全部" value="" />
            <el-option label="待审批" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </div>
      </template>

      <el-table :data="applications" v-loading="appsLoading" stripe style="width: 100%">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column prop="userName" label="申请人" width="100" />
        <el-table-column prop="reason" label="申请原因" min-width="160" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'pending' ? 'warning' : row.status === 'approved' ? 'success' : 'info'" size="small">
              {{ row.status === 'pending' ? '待审批' : row.status === 'approved' ? '已通过' : '已拒绝' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rejectReason" label="拒绝原因" width="140" show-overflow-tooltip />
        <el-table-column label="申请时间" width="160" align="center">
          <template #default="{ row }">{{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button type="primary" link size="small" :loading="apprLoading" @click="handleApprove(row)">通过</el-button>
              <el-button type="danger" link size="small" :loading="apprLoading" @click="openRejectDialog(row)">拒绝</el-button>
            </template>
            <span v-else class="cell-mono" style="color: var(--el-text-color-placeholder)">-</span>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无证书申请" :image-size="80" />
        </template>
      </el-table>
    </el-card>

    <el-dialog v-model="rejectDialogVisible" title="拒绝申请" width="420px" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-form-item label="拒绝原因" :required="true">
          <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请填写拒绝原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="apprLoading" :disabled="!rejectReason.trim()" @click="handleReject">确认拒绝</el-button>
      </template>
    </el-dialog>

    <el-card shadow="never" class="content-card" style="margin-top: 20px">
      <template #header>
        <div class="card-header-row">
          <span class="card-title">已签发证书</span>
          <el-input
            v-model="keyword"
            placeholder="搜索用户/序列号/主体"
            clearable
            style="width: 260px"
            size="small"
            @input="page = 1"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>

      <el-table
        :data="keyword ? pagedFiltered : pagedCerts"
        v-loading="certsLoading"
        stripe
        style="width: 100%"
      >
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column prop="userName" label="用户" width="110" />
        <el-table-column prop="subject" label="证书主体" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="cell-mono">{{ row.subject || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="有效期" width="210" align="center">
          <template #default="{ row }">
            <span class="cell-date">{{ fmtDate(row.notBefore) }} ~ {{ fmtDate(row.notAfter) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="serialNumber" label="序列号" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="cell-mono cell-sn">{{ row.serialNumber }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status).type" size="small" effect="light">
              {{ statusTag(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'active'"
              type="danger"
              link
              size="small"
              :loading="revoking"
              @click="handleRevoke(row)"
            >
              吊销
            </el-button>
            <span v-else class="cell-mono" style="color: var(--el-text-color-placeholder)">-</span>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty
            v-if="!certsLoading"
            :description="keyword ? '未找到匹配的证书' : '暂无已签发证书'"
            :image-size="80"
          />
        </template>
      </el-table>

      <div v-if="total > 0" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="keyword ? totalFiltered : total"
          :page-sizes="[10, 15, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          small
        />
      </div>
    </el-card>

    </div>
    </template>

<style scoped>
.ca-page { padding: 0; }

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

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--srs-text-primary, #0f172a);
}
.card-desc {
  color: var(--srs-text-tertiary, #94a3b8);
  font-size: 13px;
  margin: 0;
}

.loading-placeholder {
  padding: 20px 0;
}
.empty-state {
  padding: 32px 0;
}
.empty-desc {
  font-size: 13px;
  color: var(--srs-text-tertiary, #94a3b8);
  margin: 0 0 16px;
}

.action-bar {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.cell-mono {
  font-family: var(--srs-font-mono, 'SF Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace);
  font-size: 12px;
}
.cell-sn {
  font-size: 11px;
  letter-spacing: 0.3px;
}
.cell-date {
  font-size: 12px;
  color: var(--srs-text-secondary, #475569);
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 4px;
}
</style>