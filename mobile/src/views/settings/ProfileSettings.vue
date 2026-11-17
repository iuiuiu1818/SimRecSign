<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { userAPI } from '@/api'
import { showToast, showConfirmDialog } from 'vant'

function validateEmail(v: string): boolean {
  if (!v) return true
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    showToast('邮箱格式不正确')
    return false
  }
  return true
}

function isPhoneValid(v: string): boolean {
  return /^1[3-9]\d{9}$/.test(v)
}

const name = ref('')
const email = ref('')
const phone = ref('')
const loading = ref(false)

const bindPhone = ref('')
const bindCode = ref('')
const bindCodeCountdown = ref(0)
const bindSending = ref(false)
const bindLoading = ref(false)
const showUnbindDialog = ref(false)
const unbindPassword = ref('')
let bindTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  try {
    const res: any = await userAPI.getMe()
    const data = res.data || res
    name.value = data.name || ''
    email.value = data.email || ''
    phone.value = data.phone || ''
  } catch {   }
})

onUnmounted(() => {
  if (bindTimer) clearInterval(bindTimer)
})

async function handleSave() {
  if (!name.value) { showToast('请输入姓名'); return }
  if (!validateEmail(email.value)) return
  loading.value = true
  try {
    await userAPI.updateMe({ name: name.value, email: email.value })
    showToast('保存成功')
  } catch (e: any) {
    showToast(e?.message || '保存失败')
  } finally {
    loading.value = false }
}

async function handleSendBindCode() {
  if (bindSending.value || bindCodeCountdown.value > 0) return
  const p = bindPhone.value.trim()
  if (!isPhoneValid(p)) { showToast('请输入正确的11位手机号'); return }
  bindSending.value = true
  try {
    await userAPI.sendBindPhoneCode(p)
    showToast('验证码已发送')
    bindCodeCountdown.value = 60
    bindTimer = setInterval(() => {
      bindCodeCountdown.value--
      if (bindCodeCountdown.value <= 0 && bindTimer) {
        clearInterval(bindTimer)
        bindTimer = null
      }
    }, 1000)
  } catch (e: any) {
    showToast(e?.message || '发送失败')
  } finally {
    bindSending.value = false
  }
}

async function handleBindPhone() {
  const p = bindPhone.value.trim()
  if (!isPhoneValid(p)) { showToast('请输入正确的11位手机号'); return }
  if (!bindCode.value.trim()) { showToast('请输入验证码'); return }
  bindLoading.value = true
  try {
    await userAPI.bindPhone({ phone: p, code: bindCode.value.trim() })
    showToast('手机号绑定成功')
    phone.value = p
    bindPhone.value = ''
    bindCode.value = ''
  } catch (e: any) {
    showToast(e?.message || '绑定失败')
  } finally {
    bindLoading.value = false
  }
}

async function handleUnbindClick() {
  unbindPassword.value = ''
  try {
    await showConfirmDialog({
      title: '解绑手机号',
      message: '解绑后将无法使用手机号登录，确认解绑？',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  showUnbindDialog.value = true
}

async function handleUnbindConfirm() {
  if (!unbindPassword.value) { showToast('请输入登录密码'); return }
  try {
    await userAPI.unbindPhone(unbindPassword.value)
    showToast('手机号已解绑')
    phone.value = ''
    showUnbindDialog.value = false
  } catch (e: any) {
    showToast(e?.message || '解绑失败')
  }
}
</script>

<template>
  <div class="page-container">
    <van-form @submit="handleSave">
      <van-cell-group inset>
        <van-field v-model="name" label="姓名" placeholder="请输入姓名" clearable :rules="[{ required: true, message: '请输入姓名' }]" />
        <van-field v-model="email" label="邮箱" type="email" placeholder="请输入邮箱" clearable />
      </van-cell-group>
      <div class="btn-wrapper">
        <van-button round block type="primary" native-type="submit" :loading="loading" loading-text="保存中...">保存</van-button>
      </div>
    </van-form>

    <van-cell-group v-if="phone" inset class="phone-group">
      <van-field :model-value="phone" label="手机号" readonly>
        <template #right-icon>
          <van-button size="small" plain type="danger" @click="handleUnbindClick">解绑</van-button>
        </template>
      </van-field>
    </van-cell-group>

    <van-cell-group v-else inset class="phone-group">
      <van-field v-model="bindPhone" label="手机号" type="tel" maxlength="11" placeholder="请输入11位手机号" clearable />
      <van-field v-model="bindCode" label="验证码" type="digit" maxlength="6" placeholder="请输入验证码">
        <template #button>
          <van-button
            size="small"
            type="primary"
            :disabled="bindCodeCountdown > 0"
            :loading="bindSending"
            @click.prevent="handleSendBindCode"
          >
            {{ bindCodeCountdown > 0 ? `${bindCodeCountdown}s` : '获取验证码' }}
          </van-button>
        </template>
      </van-field>
      <div class="btn-wrapper bind-btn-wrapper">
        <van-button round block type="primary" :loading="bindLoading" loading-text="绑定中..." @click="handleBindPhone">绑定手机号</van-button>
      </div>
    </van-cell-group>

    <van-dialog
      v-model:show="showUnbindDialog"
      title="输入登录密码"
      show-cancel-button
      confirm-button-text="确认解绑"
      cancel-button-text="取消"
      @confirm="handleUnbindConfirm"
    >
      <van-field
        v-model="unbindPassword"
        type="password"
        placeholder="请输入登录密码"
        class="unbind-pwd-field"
      />
    </van-dialog>
  </div>
</template>

<style scoped>
.btn-wrapper { padding: 24px 16px; }
.phone-group { margin-top: 8px; }
.bind-btn-wrapper { padding: 16px; }
.unbind-pwd-field { margin: 8px 0; }
</style>
