<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { authAPI } from '@/api'
import { showToast } from 'vant'
import { IconLogo } from '@/components'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeTab = ref(0)
const loading = ref(false)
const tenants = ref<{ id: string; name: string }[]>([])
const selectedTenantId = ref('')
const showTenantPicker = ref(false)

const loginForm = ref({ email: '', password: '' })
const registerForm = ref({ email: '', password: '', confirmPassword: '', name: '' })

const formErrors = ref({ email: '', password: '', name: '', confirmPassword: '' })

onMounted(async () => {
  try {
    const res: any = await authAPI.listTenants()
    tenants.value = res.data?.list || []
    if (tenants.value.length > 0) {
      selectedTenantId.value = tenants.value[0].id
    }
  } catch {
  }
})

function validateEmail(v: string): boolean {
  if (!v) { formErrors.value.email = '请输入邮箱'; return false }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { formErrors.value.email = '邮箱格式不正确'; return false }
  formErrors.value.email = ''
  return true
}

function validatePassword(v: string): boolean {
  if (!v) { formErrors.value.password = '请输入密码'; return false }
  if (v.length < 6) { formErrors.value.password = '密码至少6位'; return false }
  formErrors.value.password = ''
  return true
}

async function handleLogin() {
  const validE = validateEmail(loginForm.value.email)
  const validP = validatePassword(loginForm.value.password)
  if (!validE || !validP) return

  loading.value = true
  try {
    await userStore.login(loginForm.value.email, loginForm.value.password, selectedTenantId.value || undefined)
    showToast('登录成功')
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch (e: any) {
    showToast(e?.message || '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  let valid = true
  if (!registerForm.value.name) { formErrors.value.name = '请输入姓名'; valid = false }
  else { formErrors.value.name = '' }

  if (!validateEmail(registerForm.value.email)) valid = false
  if (!validatePassword(registerForm.value.password)) valid = false
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    formErrors.value.confirmPassword = '两次密码不一致'; valid = false
  } else { formErrors.value.confirmPassword = '' }

  if (!valid) return

  loading.value = true
  try {
    await userStore.register(
      registerForm.value.email,
      registerForm.value.password,
      registerForm.value.name,
      selectedTenantId.value || undefined
    )
    showToast('注册成功')
    router.push('/dashboard')
  } catch (e: any) {
    showToast(e?.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg-decor">
      <div class="decor-circle decor-circle-1"></div>
      <div class="decor-circle decor-circle-2"></div>
      <div class="decor-circle decor-circle-3"></div>
    </div>

    <div class="login-header">
      <div class="brand-logo-row">
        <IconLogo :size="48" />
        <h1 class="brand-title">简录签</h1>
      </div>
      <p class="brand-desc">轻量级电子文档签署平台</p>
      <p class="brand-sub muted">安全 · 高效 · 可信赖</p>
    </div>

    <div class="login-card">

      <van-field
        v-if="tenants.length > 1"
        v-model="selectedTenantId"
        label="租户"
        placeholder="请选择租户"
        is-link
        readonly
        @click="showTenantPicker = true"
      />
      <van-field
        v-else-if="tenants.length === 1"
        :model-value="tenants[0].name"
        label="租户"
        readonly
      />

      <van-tabs v-model:active="activeTab" sticky>
        <van-tab title="登录">
          <van-form @submit="handleLogin" class="auth-form">
            <van-field
              v-model="loginForm.email"
              label="邮箱"
              type="email"
              placeholder="请输入邮箱"
              :error-message="formErrors.email"
              @blur="validateEmail(loginForm.email)"
              clearable
            />
            <van-field
              v-model="loginForm.password"
              label="密码"
              type="password"
              placeholder="请输入密码"
              :error-message="formErrors.password"
              @blur="validatePassword(loginForm.password)"
            />
            <div class="form-btn-wrapper">
              <van-button
                round
                block
                type="primary"
                native-type="submit"
                :loading="loading"
                loading-text="登录中..."
                class="auth-btn"
              >
                登录
              </van-button>
            </div>
          </van-form>
        </van-tab>

        <van-tab title="注册">
          <van-form @submit="handleRegister" class="auth-form">
            <van-field
              v-model="registerForm.name"
              label="姓名"
              placeholder="请输入姓名"
              :error-message="formErrors.name"
              clearable
            />
            <van-field
              v-model="registerForm.email"
              label="邮箱"
              type="email"
              placeholder="请输入邮箱"
              :error-message="formErrors.email"
              @blur="validateEmail(registerForm.email)"
              clearable
            />
            <van-field
              v-model="registerForm.password"
              label="密码"
              type="password"
              placeholder="请设置密码（至少6位）"
              :error-message="formErrors.password"
              @blur="validatePassword(registerForm.password)"
            />
            <van-field
              v-model="registerForm.confirmPassword"
              label="确认密码"
              type="password"
              placeholder="再次输入密码"
              :error-message="formErrors.confirmPassword"
              @blur="registerForm.confirmPassword && registerForm.password !== registerForm.confirmPassword ? formErrors.confirmPassword = '两次密码不一致' : formErrors.confirmPassword = ''"
            />
            <div class="form-btn-wrapper">
              <van-button
                round
                block
                type="primary"
                native-type="submit"
                :loading="loading"
                loading-text="注册中..."
                class="auth-btn"
              >
                注册
              </van-button>
            </div>
          </van-form>
        </van-tab>
      </van-tabs>
    </div>

    <van-popup v-model:show="showTenantPicker" position="bottom" round>
      <van-picker
        :columns="tenants.map(t => ({ text: t.name, value: t.id }))"
        @confirm="(v: any) => { selectedTenantId = v.selectedValues[0]; showTenantPicker = false }"
        @cancel="showTenantPicker = false"
      />
    </van-popup>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, var(--srs-primary-bg) 0%, var(--srs-bg-page) 50%);
  display: flex;
  flex-direction: column;
  padding: 48px 24px 24px;
  position: relative;
  overflow: hidden;
}

.login-bg-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.decor-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.08;
}

.decor-circle-1 {
  width: 280px;
  height: 280px;
  background: var(--srs-primary);
  top: -80px;
  right: -60px;
}

.decor-circle-2 {
  width: 180px;
  height: 180px;
  background: var(--srs-primary-light);
  bottom: 20%;
  left: -60px;
}

.decor-circle-3 {
  width: 120px;
  height: 120px;
  background: var(--srs-primary-dark);
  bottom: 10%;
  right: 20%;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
}

.brand-logo-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 12px;
}

.brand-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--srs-primary);
  margin: 0;
}

.brand-desc {
  font-size: 14px;
  color: var(--srs-text-tertiary);
  margin: 0 0 4px;
}

.brand-sub {
  font-size: 12px;
  letter-spacing: 2px;
}

.login-card {
  background: var(--srs-bg-card);
  border-radius: var(--srs-radius-xl);
  box-shadow: var(--srs-shadow-lg), 0 0 0 1px var(--srs-primary-border);
  padding: 8px 0;
  position: relative;
  z-index: 1;
}

.auth-form {
  padding: 16px 16px 0;
}

.form-btn-wrapper {
  padding: 20px 0 16px;
}

.auth-btn {
  transition: transform var(--srs-transition-fast) ease;
}

.auth-btn:active {
  transform: scale(0.98);
}
</style>