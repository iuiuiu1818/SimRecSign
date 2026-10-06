<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { authAPI } from '@/api'
import type { AxiosError } from 'axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const isRegister = ref(false)
const form = ref({
  email: '',
  password: '',
  name: '',
  confirmPassword: '',
})
const loading = ref(false)
const errorMsg = ref('')

const tenants = ref<any[]>([])
const selectedTenantId = ref('')

function getErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ code?: number; msg?: string }>

  if (!axiosErr.response) {
    if (axiosErr.code === 'ECONNABORTED') {
      return '请求超时，请检查网络连接后重试'
    }
    if (axiosErr.code === 'ERR_NETWORK') {
      return '网络连接失败，请检查服务器是否正常运行'
    }
    return '网络异常，请稍后重试'
  }

  const { status, data } = axiosErr.response

  if (data?.msg) {
    return data.msg
  }

  switch (status) {
    case 400:
      return '请求数据格式错误，请检查输入'
    case 401:
      return '认证失败，请检查邮箱和密码'
    case 403:
      return '权限不足，无法访问'
    case 404:
      return '服务接口不存在，请联系管理员'
    case 429:
      return '请求过于频繁，请稍后重试'
    default:
      if (status >= 500) {
        return '服务器内部错误，请稍后重试或联系管理员'
      }
      return `请求失败 (${status})`
  }
}

function clearError() {
  errorMsg.value = ''
}

watch(isRegister, clearError)

async function loadTenants() {
  try {
    const res: any = await authAPI.listTenants()
    tenants.value = res.data?.list || []
    if (tenants.value.length > 0) {
      selectedTenantId.value = tenants.value[0].id
    }
  } catch {   }
}

loadTenants()

async function handleSubmit() {
  clearError()

  if (loading.value) return

  if (!form.value.email || !form.value.password) {
    errorMsg.value = '请填写邮箱和密码'
    return
  }
  if (isRegister.value && form.value.password !== form.value.confirmPassword) {
    errorMsg.value = '两次密码输入不一致'
    return
  }

  loading.value = true
  try {
    if (isRegister.value) {
      await userStore.register(form.value.email, form.value.password, form.value.name, selectedTenantId.value || undefined)
      ElMessage.success('注册成功，即将跳转')
    } else {
      await userStore.login(form.value.email, form.value.password, selectedTenantId.value || undefined)
      ElMessage.success('登录成功，即将跳转')
    }
    router.push('/dashboard')
  } catch (err) {
    errorMsg.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-grid" />
    </div>
    <div class="login-container">
      <div class="login-left">
        <div class="brand">
          <div class="brand-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="#2563EB"/>
              <path d="M12 26L18 20L12 14" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20 26H28" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="brand-text">
            <h1>简录签</h1>
            <p>SimRecSign</p>
          </div>
        </div>
        <div class="login-features">
          <div class="feature-item">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16.6667 5L7.5 14.1667L3.33337 10" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>结构化数据采集与电子签署</span>
          </div>
          <div class="feature-item">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16.6667 5L7.5 14.1667L3.33337 10" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>顺序多人协作工作流</span>
          </div>
          <div class="feature-item">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16.6667 5L7.5 14.1667L3.33337 10" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>PKCS#7 签名 + TSA 时间戳</span>
          </div>
        </div>
        <div class="login-footer-text">
          <p>企业级电子签署平台 · 私有化部署</p>
        </div>
      </div>
      <div class="login-right">
        <div class="login-card">
          <div class="card-header">
            <h2>{{ isRegister ? '注册账号' : '登录' }}</h2>
            <p>{{ isRegister ? '创建您的简录签账号' : '欢迎回到简录签' }}</p>
          </div>

          <div v-if="errorMsg" class="error-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{{ errorMsg }}</span>
          </div>

          <el-form
            :model="form"
            label-position="top"
            class="login-form"
            @keyup.enter="handleSubmit"
          >
            <el-form-item label="邮箱">
              <el-input
                v-model="form.email"
                placeholder="name@company.com"
                :prefix-icon="'Message'"
                size="large"
              />
            </el-form-item>
            <el-form-item v-if="isRegister" label="姓名">
              <el-input
                v-model="form.name"
                placeholder="请输入姓名"
                :prefix-icon="'User'"
                size="large"
              />
            </el-form-item>
            <el-form-item label="密码">
              <el-input
                v-model="form.password"
                type="password"
                show-password
                placeholder="请输入密码"
                :prefix-icon="'Lock'"
                size="large"
              />
            </el-form-item>

            <el-form-item v-if="isRegister" label="确认密码">
              <el-input
                v-model="form.confirmPassword"
                type="password"
                show-password
                placeholder="请再次输入密码"
                :prefix-icon="'Lock'"
                size="large"
              />
            </el-form-item>
            <el-form-item label="所属机构">
              <el-select v-model="selectedTenantId" placeholder="选择机构" style="width: 100%">
                <el-option
                  v-for="t in tenants"
                  :key="t.id"
                  :label="t.name"
                  :value="t.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="loading"
                class="submit-btn"
                @click="handleSubmit"
              >
                {{ isRegister ? '注册' : '登录' }}
              </el-button>
            </el-form-item>
          </el-form>
          <div class="card-footer">
            <span>{{ isRegister ? '已有账号？' : '没有账号？' }}</span>
            <el-button link type="primary" @click="isRegister = !isRegister">
              {{ isRegister ? '去登录' : '去注册' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  background: var(--srs-bg-page);
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(37, 99, 235, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37, 99, 235, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

.login-container {
  display: flex;
  width: 100%;
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

.login-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 80px;
  max-width: 520px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 48px;
}

.brand-icon {
  flex-shrink: 0;
}

.brand-text h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--srs-text-primary);
  margin: 0;
  line-height: 1.2;
}

.brand-text p {
  font-size: 14px;
  color: var(--srs-text-tertiary);
  margin: 2px 0 0;
  letter-spacing: 0.05em;
}

.login-features {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 48px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: var(--srs-text-secondary);
  font-weight: 500;
}

.feature-item svg {
  flex-shrink: 0;
}

.login-footer-text p {
  font-size: 13px;
  color: var(--srs-text-tertiary);
}

.login-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--srs-bg-page);
  transition: background var(--srs-transition-normal);
}

html.dark .login-right {
  background: linear-gradient(135deg, var(--srs-bg-page) 0%, var(--srs-bg-card) 100%);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--srs-bg-card);
  border-radius: var(--srs-radius-xl);
  padding: 40px;
  box-shadow: var(--srs-shadow-md);
  border: 1px solid var(--srs-border);
  transition: background var(--srs-transition-normal), border-color var(--srs-transition-normal);
}

.error-alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 20px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--srs-radius-md, 8px);
  color: #b91c1c;
  font-size: 14px;
  line-height: 1.5;
  animation: errorSlideIn 0.3s ease-out;
}

html.dark .error-alert {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.error-alert svg {
  flex-shrink: 0;
  margin-top: 1px;
}

@keyframes errorSlideIn {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  margin-bottom: 32px;
}

.card-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--srs-text-primary);
  margin: 0 0 8px;
}

.card-header p {
  font-size: 15px;
  color: var(--srs-text-tertiary);
  margin: 0;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.login-form :deep(.el-form-item__label) {
  font-size: 14px;
  font-weight: 600;
  color: var(--srs-text-secondary);
  padding-bottom: 6px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: var(--srs-radius-md);
  border: 1px solid var(--srs-border-input);
  box-shadow: none;
  padding: 4px 12px;
  transition: border-color var(--srs-transition-fast), box-shadow var(--srs-transition-fast);
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: var(--srs-text-tertiary);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: var(--srs-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.login-form :deep(.el-input--large .el-input__inner) {
  height: 44px;
  font-size: 15px;
}

.login-form :deep(.el-input__prefix) {
  margin-right: 8px;
}

.login-form :deep(.el-input__prefix-inner > svg) {
  color: var(--srs-text-tertiary);
}

.submit-btn {
  width: 100%;
  height: 44px;
  border-radius: var(--srs-radius-md);
  font-size: 15px;
  font-weight: 600;
  margin-top: 8px;
  background: var(--srs-primary);
  border: none;
  transition: background var(--srs-transition-fast);
}

.submit-btn:hover {
  background: var(--srs-primary-dark);
}

.card-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: var(--srs-text-tertiary);
}

.card-footer :deep(.el-button) {
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .login-left {
    display: none;
  }
  .login-right {
    padding: 20px;
  }
  .login-card {
    padding: 32px 24px;
    border-radius: var(--srs-radius-lg);
  }
}
</style>