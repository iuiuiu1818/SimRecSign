<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { authAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { showToast, showDialog } from 'vant'

const userStore = useUserStore()
const loading = ref(false)
const certInfo = ref<any>(null)
const password = ref('')

const showApplyDialog = ref(false)
const applyPassword = ref('')
const applyReason = ref('')
const applying = ref(false)
const applications = ref<any[]>([])
const hasPendingApply = ref(false)

const caCertInfo = ref<any>(null)

async function loadApplications() {
  try {
    const res: any = await authAPI.getMyApplications()
    applications.value = res.data || []
    hasPendingApply.value = applications.value.some((a: any) => a.status === 'pending')
  } catch { applications.value = [] }
}

async function loadCACert() {
  try {
    const res: any = await authAPI.getMyCACert()
    caCertInfo.value = res.data
  } catch { caCertInfo.value = null }
}

async function handleApplyCert() {
  if (!applyPassword.value) { showToast('请输入签名密码'); return false }
  applying.value = true
  try {
    await authAPI.caApply({ password: applyPassword.value, reason: applyReason.value })
    showToast('申请已提交，请等待管理员审批')
    showApplyDialog.value = false
    applyPassword.value = ''
    applyReason.value = ''
    await loadApplications()
    return true
  } catch (e: any) {
    showToast(e?.message || '申请失败')
    return false
  } finally {
    applying.value = false
  }
}

onMounted(async () => {
  try {
    const res: any = await authAPI.getCertificateInfo()
    certInfo.value = res.data
  } catch {   }
  loadApplications()
  loadCACert()
})

function onFileUpload(file: File) {
  if (!password.value) { showToast('请先输入签名密码'); return }
  const formData = new FormData()
  formData.append('file', file)
  formData.append('password', password.value)
  loading.value = true
  authAPI.uploadCertificate(formData).then(() => {
    showToast('上传成功')
    userStore.hasCertificate = true
    authAPI.getCertificateInfo().then(res => { certInfo.value = (res as any).data })
  }).catch((e: any) => {
    showToast(e?.message || '上传失败')
  }).finally(() => {
    loading.value = false
  })
}

async function handleDelete() {
  if (!password.value) { showToast('请输入签名密码'); return }
  showDialog({
    title: '确认删除',
    message: '确定删除证书？',
    confirmButtonText: '删除',
  }).then(async () => {
    try {
      await authAPI.deleteCertificate(password.value)
      showToast('已删除')
      certInfo.value = null
      userStore.hasCertificate = false
    } catch (e: any) {
      showToast(e?.message || '删除失败')
    }
  }).catch(() => {})
}
</script>

<template>
  <div class="page-container">
    <van-form>
      <van-cell-group inset>
        <van-field v-model="password" label="签名密码" type="password" placeholder="请输入签名密码验证身份" :rules="[{ required: true, message: '请输入签名密码' }]" />
      </van-cell-group>

      <div v-if="certInfo" class="m-card">
        <div class="section-title">证书信息</div>
        <van-cell-group :border="false">
          <van-cell title="颁发者" :value="certInfo.issuer || '-'" />
          <van-cell title="主题" :value="certInfo.subject || '-'" />
          <van-cell title="有效期" :value="certInfo.validFrom && certInfo.validTo ? `${certInfo.validFrom} ~ ${certInfo.validTo}` : '-'" />
        </van-cell-group>
      </div>

      <div class="upload-area">
        <van-uploader :after-read="(f: any) => onFileUpload(f.file)" accept=".pfx,.p12" :max-size="10485760">
          <van-button plain type="primary" block :loading="loading" loading-text="上传中...">{{ certInfo ? '更换证书' : '上传证书' }}</van-button>
        </van-uploader>
        <p class="upload-tip muted">支持 PFX/P12 格式，≤10MB</p>
      </div>

      <div v-if="certInfo" class="btn-wrapper">
        <van-button round block plain type="danger" @click="handleDelete">删除证书</van-button>
      </div>

      <div v-if="caCertInfo" class="m-card">
        <div class="section-title">CA 签发证书</div>
        <van-cell-group :border="false">
          <van-cell title="颁发者" :value="caCertInfo.issuer || '-'" />
          <van-cell title="主体" :value="caCertInfo.subject || '-'" />
          <van-cell title="有效期" :value="caCertInfo.notBefore && caCertInfo.notAfter ? `${caCertInfo.notBefore} ~ ${caCertInfo.notAfter}` : '-'" />
        </van-cell-group>
      </div>

      <div v-if="!certInfo && !caCertInfo && !hasPendingApply">
        <van-cell-group inset class="m-card">
          <van-cell title="申请 CA 证书" is-link @click="showApplyDialog = true" label="生成密钥对并由管理员审批签发" />
        </van-cell-group>
      </div>

      <div v-if="applications.length > 0" class="m-card">
        <div class="section-title">申请记录</div>
        <van-cell-group :border="false">
          <van-cell v-for="app in applications" :key="app.id" :title="`证书申请 ${app.status === 'pending' ? '（待审批）' : app.status === 'approved' ? '（已通过）' : '（已拒绝）'}`" :label="app.reason ? `原因：${app.reason}` : ''" />
        </van-cell-group>
      </div>

      <van-dialog v-model:show="showApplyDialog" title="申请 CA 证书" show-cancel-button :before-close="handleApplyCert">
        <div style="padding: 16px">
          <van-field v-model="applyPassword" type="password" label="签名密码" placeholder="请输入签名密码" required />
          <van-field v-model="applyReason" type="textarea" label="申请原因" placeholder="选填：说明申请用途" :maxlength="200" show-word-limit rows="2" autosize />
        </div>
      </van-dialog>
    </van-form>
  </div>
</template>

<style scoped>
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
  margin-bottom: 12px;
}

.upload-area {
  padding: 24px 16px;
}

.upload-tip {
  font-size: 12px;
  text-align: center;
  margin-top: 12px;
  color: var(--srs-text-tertiary);
}

.btn-wrapper {
  padding: 8px 16px 24px;
}
</style>