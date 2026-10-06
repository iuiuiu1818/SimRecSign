<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { authAPI, caAPI } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const signPassword = ref('')
const pfxPassword = ref('')
const saving = ref(false)
const file = ref<File | null>(null)

interface CertificateInfo {
  subject: string
  issuer: string
  notBefore: string
  notAfter: string
  serialNumber: string
  signatureAlgorithm: string
  hasPrivateKey: boolean
}
const certInfo = ref<CertificateInfo | null>(null)
const certLoading = ref(false)

interface CACertInfo {
  subject: string
  issuer: string
  serialNumber: string
  notBefore: string
  notAfter: string
  algorithm: string
}
const caCertInfo = ref<CACertInfo | null>(null)
const caCertLoading = ref(false)

function handleFileChange(uploadFile: any) {
  if (uploadFile.raw) {
    file.value = uploadFile.raw
  }
  return false
}

function handleFileRemove() {
  file.value = null
}

async function handleUpload() {
  if (!signPassword.value) {
    ElMessage.warning('请先验证签名密码')
    return
  }
  if (!file.value) {
    ElMessage.warning('请选择证书文件')
    return
  }
  saving.value = true
  try {
    const formData = new FormData()
    formData.append('file', file.value)
    formData.append('password', signPassword.value)
    formData.append('pfxPassword', pfxPassword.value)
    await authAPI.uploadCertificate(formData)
    ElMessage.success('证书上传成功')
    file.value = null
    userStore.hasCertificate = true
    localStorage.setItem('hasCertificate', 'true')
    await loadCertInfo()
  } catch {   }
  finally { saving.value = false }
}

async function loadCertInfo() {
  if (!userStore.hasCertificate) {
    certInfo.value = null
    return
  }
  certLoading.value = true
  try {
    const res: any = await authAPI.getCertificateInfo()
    certInfo.value = res.data
  } catch {
    certInfo.value = null
  } finally {
    certLoading.value = false
  }
}

async function handleDelete() {
  if (!signPassword.value) {
    ElMessage.warning('请先输入签名密码以验证身份')
    return
  }
  try {
    await ElMessageBox.confirm(
      '确定要删除当前证书吗？删除后需重新上传证书，已签署的文档不受影响。',
      '确认删除',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
    await authAPI.deleteCertificate(signPassword.value)
    ElMessage.success('证书已删除')
    userStore.hasCertificate = false
    localStorage.setItem('hasCertificate', 'false')
    certInfo.value = null
  } catch {
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function isExpired(dateStr: string): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

async function loadCACertInfo() {
  caCertLoading.value = true
  try {
    const res: any = await caAPI.getMyCACert()
    caCertInfo.value = res.data
  } catch {
    caCertInfo.value = null
  } finally {
    caCertLoading.value = false
  }
}

interface ApplicationItem {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  reason: string
  rejectReason?: string
  createdAt: string
  approvedAt?: number | null
}
const myApplications = ref<ApplicationItem[]>([])
const myAppsLoading = ref(false)
const applyDialogVisible = ref(false)
const applyReason = ref('')
const applyPassword = ref('')
const applying = ref(false)

async function loadMyApplications() {
  myAppsLoading.value = true
  try {
    const res: any = await caAPI.getMyApplications()
    myApplications.value = res.data || []
  } catch { myApplications.value = [] }
  finally { myAppsLoading.value = false }
}

function openApplyDialog() {
  applyReason.value = ''
  applyPassword.value = ''
  applyDialogVisible.value = true
}

async function handleApply() {
  if (!applyPassword.value) {
    ElMessage.warning('请输入签名密码')
    return
  }
  applying.value = true
  try {
    await caAPI.apply({ password: applyPassword.value, reason: applyReason.value })
    ElMessage.success('证书申请已提交，请等待管理员审批')
    applyDialogVisible.value = false
    await loadMyApplications()
  } catch {   }
  finally { applying.value = false }
}

async function downloadMyCACertPem() {
  try {
    await caAPI.downloadMyCACert()
  } catch {   }
}

function fmtDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function statusTag(status: string) {
  const m: Record<string, { label: string; type: string }> = {
    pending: { label: '待审批', type: 'warning' },
    approved: { label: '已通过', type: 'success' },
    rejected: { label: '已拒绝', type: 'danger' },
  }
  return m[status] || { label: status, type: 'info' }
}

const hasPendingApplication = computed(() => myApplications.value.some(a => a.status === 'pending'))

onMounted(() => {
  loadCertInfo()
  loadCACertInfo()
  loadMyApplications()
})
</script>

<template>
  <div class="settings-card-wrapper">
    <el-row :gutter="20">

      <el-col :xs="24" :md="14">
        <el-card shadow="never" class="settings-card">
          <template #header><span class="card-title">我的证书</span></template>
          <p class="card-desc">
            上传由第三方 CA 签发的 PFX/P12 格式数字证书，用于签署文档时生成数字签名。
          </p>

          <div v-if="certLoading" style="margin-bottom: 16px;">
            <el-tag type="info" effect="plain">正在加载证书信息...</el-tag>
          </div>
          <div v-else-if="certInfo" class="cert-info-card">
            <h4 class="cert-info-title">当前证书</h4>
            <el-descriptions :column="1" direction="vertical" size="small" border>
              <el-descriptions-item label="主题（Subject）">
                {{ certInfo.subject }}
              </el-descriptions-item>
              <el-descriptions-item label="颁发者（Issuer）">
                {{ certInfo.issuer }}
              </el-descriptions-item>
              <el-descriptions-item label="有效期">
                <span>{{ formatDate(certInfo.notBefore) }} ~ {{ formatDate(certInfo.notAfter) }}</span>
                <el-tag
                  :type="isExpired(certInfo.notAfter) ? 'danger' : 'success'"
                  effect="plain"
                  size="small"
                  style="margin-left: 8px"
                >
                  {{ isExpired(certInfo.notAfter) ? '已过期' : '有效' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="序列号">
                {{ certInfo.serialNumber }}
              </el-descriptions-item>
              <el-descriptions-item label="签名算法">
                {{ certInfo.signatureAlgorithm }}
              </el-descriptions-item>
              <el-descriptions-item label="私钥状态">
                <el-tag :type="certInfo.hasPrivateKey ? 'success' : 'warning'" effect="plain" size="small">
                  {{ certInfo.hasPrivateKey ? '已加密存储' : '缺失' }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
            <div style="margin-top: 12px;">
              <el-button size="small" type="danger" plain @click="handleDelete">
                删除证书
              </el-button>
            </div>
            <el-divider />
          </div>
          <div v-else-if="!userStore.hasCertificate" style="margin-bottom: 16px;">
            <el-tag type="info" effect="plain">尚未上传证书</el-tag>
          </div>

          <div v-if="caCertLoading" style="margin-bottom: 16px;">
            <el-tag type="info" effect="plain">正在加载 CA 签发证书信息...</el-tag>
          </div>
          <div v-else-if="caCertInfo" class="cert-info-card" style="margin-bottom: 20px;">
            <h4 class="cert-info-title">
              <el-icon style="margin-right: 4px; vertical-align: middle"><Link /></el-icon>
              平台 CA 签发证书
            </h4>
            <el-tag type="success" size="small" effect="light" style="margin-bottom: 12px; display: inline-block;">
              管理员已为您签发，可直接用于签署
            </el-tag>
            <el-descriptions :column="1" direction="vertical" size="small" border>
              <el-descriptions-item label="主题（Subject）">
                {{ caCertInfo.subject }}
              </el-descriptions-item>
              <el-descriptions-item label="颁发者（Issuer）">
                {{ caCertInfo.issuer }}
              </el-descriptions-item>
              <el-descriptions-item label="有效期">
                <span>{{ formatDate(caCertInfo.notBefore) }} ~ {{ formatDate(caCertInfo.notAfter) }}</span>
                <el-tag
                  :type="isExpired(caCertInfo.notAfter) ? 'danger' : 'success'"
                  effect="plain"
                  size="small"
                  style="margin-left: 8px"
                >
                  {{ isExpired(caCertInfo.notAfter) ? '已过期' : '有效' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="序列号">
                {{ caCertInfo.serialNumber }}
              </el-descriptions-item>
              <el-descriptions-item label="签名算法">
                {{ caCertInfo.algorithm }}
              </el-descriptions-item>
            </el-descriptions>
            <div style="margin-top: 12px;">
              <el-button size="small" @click="downloadMyCACertPem()">下载证书（PEM）</el-button>
            </div>
            <el-divider />
          </div>
          <div v-else-if="!caCertLoading && !userStore.hasCertificate" style="margin-bottom: 16px;">
            <el-tag type="info" effect="plain">暂无平台 CA 签发证书</el-tag>
          </div>

          <div v-if="!caCertInfo && !userStore.hasCertificate" class="cert-info-card" style="margin-bottom: 20px;">
            <h4 class="cert-info-title">
              <el-icon style="margin-right: 4px; vertical-align: middle"><Edit /></el-icon>
              申请平台证书
            </h4>
            <p style="font-size: 13px; color: var(--srs-text-tertiary, #64748b); margin: 0 0 12px;">
              向管理员申请由平台 CA 签发的数字证书，审批通过后即可用于文档签署。
            </p>
            <el-button
              type="primary"
              size="small"
              @click="openApplyDialog"
              :disabled="hasPendingApplication"
            >
              {{ hasPendingApplication ? '已提交申请，等待审批' : '申请证书' }}
            </el-button>
          </div>

          <div v-if="myApplications.length > 0" class="cert-info-card" style="margin-bottom: 20px;">
            <h4 class="cert-info-title">我的申请记录</h4>
            <el-timeline v-if="!myAppsLoading">
              <el-timeline-item
                v-for="app in myApplications"
                :key="app.id"
                :timestamp="fmtDateTime(app.createdAt)"
                :type="app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'"
              >
                <div style="display: flex; align-items: center; gap: 8px;">
                  <el-tag :type="statusTag(app.status).type" size="small" effect="light">
                    {{ statusTag(app.status).label }}
                  </el-tag>
                  <span v-if="app.reason" style="font-size: 13px;">{{ app.reason }}</span>
                </div>
                <div v-if="app.status === 'rejected' && app.rejectReason" style="margin-top: 4px; font-size: 12px; color: var(--el-color-danger);">
                  拒绝原因：{{ app.rejectReason }}
                </div>
              </el-timeline-item>
            </el-timeline>
            <div v-else style="padding: 8px 0;">
              <el-tag type="info" effect="plain">正在加载...</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="10">
        <el-card shadow="never" class="settings-card">
          <template #header><span class="card-title">上传证书</span></template>
          <el-form label-position="top">
            <el-form-item label="签名密码（需验证身份）">
              <el-input v-model="signPassword" type="password" show-password placeholder="请输入签名密码" />
            </el-form-item>
            <el-form-item label="PFX 文件密码">
              <el-input v-model="pfxPassword" type="password" show-password placeholder="请输入 PFX 文件加密密码（若无密码则留空）" />
              <div class="form-item-hint">
                部分 PFX/P12 证书文件带有加密密码，需输入后才能解析。若无密码请留空。
              </div>
            </el-form-item>
            <el-form-item label="选择证书文件">
              <el-upload
                drag
                accept=".pfx,.p12"
                :auto-upload="false"
                :limit="1"
                :on-change="handleFileChange"
                :on-remove="handleFileRemove"
                :show-file-list="true"
              >
                <el-icon class="el-icon--upload" style="font-size: 48px"><UploadFilled /></el-icon>
                <div class="el-upload__text">拖拽证书文件到此处，或 <em>点击选择</em></div>
                <div class="el-upload__tip">支持 .pfx、.p12 格式，文件大小不超过 10MB</div>
              </el-upload>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="handleUpload" :disabled="!file">
                {{ certInfo ? '更新证书' : '上传并应用' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="applyDialogVisible" title="申请平台证书" width="460px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="签名密码（需验证身份）">
          <el-input v-model="applyPassword" type="password" show-password placeholder="请输入签名密码" />
        </el-form-item>
        <el-form-item label="申请理由（可选）">
          <el-input v-model="applyReason" type="textarea" :rows="3" placeholder="请简要说明申请证书的用途" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applyDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="applying" :disabled="!applyPassword" @click="handleApply">
          提交申请
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.settings-card-wrapper {
  max-width: 1080px;
}
.settings-card {
  border-radius: var(--srs-radius-lg);
  border: 1px solid var(--srs-border);
  height: 100%;
}
.cert-info-card {
  background: var(--srs-primary-bg);
  border: 1px solid var(--srs-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--srs-text-primary);
}
.card-desc {
  color: var(--srs-text-tertiary);
  font-size: 13px;
  margin-bottom: 16px;
}
.form-item-hint {
  font-size: 12px;
  color: var(--srs-text-tertiary);
  margin-top: 4px;
}
.cert-info-title {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--srs-text-primary);
}
</style>