<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { userAPI } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const userStore = useUserStore()
const name = ref(userStore.userName)
const email = ref('')
const phone = ref('')
const saving = ref(false)

const bindPhone = ref('')
const bindCode = ref('')
const bindCodeCountdown = ref(0)
const bindSending = ref(false)
const bindLoading = ref(false)
let bindTimer: ReturnType<typeof setInterval> | null = null

function isPhoneValid(v: string): boolean {
  return /^1[3-9]\d{9}$/.test(v)
}

onMounted(async () => {
  try {
    const res: any = await userAPI.getMe()
    const data = res.data
    name.value = data.name || ''
    email.value = data.email || ''
    phone.value = data.phone || ''
  } catch {   }
})

onUnmounted(() => {
  if (bindTimer) clearInterval(bindTimer)
})

async function handleSave() {
  saving.value = true
  try {
    await userAPI.updateMe({ name: name.value, email: email.value })
    ElMessage.success('保存成功')
  } catch {   }
  finally { saving.value = false }
}

async function handleSendBindCode() {
  if (bindSending.value || bindCodeCountdown.value > 0) return
  const p = bindPhone.value.trim()
  if (!isPhoneValid(p)) {
    ElMessage.warning('请输入正确的11位手机号')
    return
  }
  bindSending.value = true
  try {
    await userAPI.sendBindPhoneCode(p)
    ElMessage.success('验证码已发送，请查收')
    bindCodeCountdown.value = 60
    bindTimer = setInterval(() => {
      bindCodeCountdown.value--
      if (bindCodeCountdown.value <= 0 && bindTimer) {
        clearInterval(bindTimer)
        bindTimer = null
      }
    }, 1000)
  } catch {   }
  finally { bindSending.value = false }
}

async function handleBindPhone() {
  const p = bindPhone.value.trim()
  if (!isPhoneValid(p)) {
    ElMessage.warning('请输入正确的11位手机号')
    return
  }
  if (!bindCode.value.trim()) {
    ElMessage.warning('请输入验证码')
    return
  }
  bindLoading.value = true
  try {
    await userAPI.bindPhone({ phone: p, code: bindCode.value.trim() })
    ElMessage.success('手机号绑定成功')
    phone.value = p
    bindPhone.value = ''
    bindCode.value = ''
  } catch {   }
  finally { bindLoading.value = false }
}

async function handleUnbindPhone() {
  try {
    const { value } = await ElMessageBox.prompt('解绑后将无法使用手机号登录，请输入登录密码确认', '解绑手机号', {
      confirmButtonText: '确认解绑',
      cancelButtonText: '取消',
      inputType: 'password',
      inputPlaceholder: '请输入登录密码',
      inputValidator: (v: string) => !!v || '密码不能为空',
    })
    await userAPI.unbindPhone(value)
    ElMessage.success('手机号已解绑')
    phone.value = ''
  } catch {   }
}
</script>

<template>
  <div class="settings-card-wrapper">
    <el-card shadow="never" class="settings-card">
      <template #header><span class="card-title">个人信息</span></template>
      <el-form label-position="top" style="max-width: 480px">
        <el-form-item label="姓名">
          <el-input v-model="name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="settings-card phone-card">
      <template #header><span class="card-title">手机号</span></template>

      <div v-if="phone" class="phone-bound">
        <div class="phone-display">
          <span class="phone-number">{{ phone }}</span>
          <el-tag size="small" type="success">已绑定</el-tag>
        </div>
        <el-button plain type="danger" size="small" @click="handleUnbindPhone">解绑</el-button>
      </div>

      <el-form v-else label-position="top" style="max-width: 480px">
        <el-form-item label="手机号">
          <el-input v-model="bindPhone" placeholder="请输入11位手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="验证码">
          <div class="bind-code-row">
            <el-input v-model="bindCode" placeholder="请输入验证码" maxlength="6" />
            <el-button
              :disabled="bindCodeCountdown > 0"
              :loading="bindSending"
              @click="handleSendBindCode"
            >
              {{ bindCodeCountdown > 0 ? `${bindCodeCountdown}s 后重发` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="bindLoading" @click="handleBindPhone">绑定手机号</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.settings-card-wrapper {
  max-width: 640px;
}
.settings-card {
  border-radius: var(--srs-radius-lg);
  border: 1px solid var(--srs-border);
}
.phone-card {
  margin-top: 16px;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--srs-text-primary);
}
.phone-bound {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 480px;
  padding: 8px 0;
}
.phone-display {
  display: flex;
  align-items: center;
  gap: 8px;
}
.phone-number {
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
  letter-spacing: 0.03em;
}
.bind-code-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.bind-code-row .el-input {
  flex: 1;
}
.bind-code-row .el-button {
  flex-shrink: 0;
  width: 120px;
}
</style>
