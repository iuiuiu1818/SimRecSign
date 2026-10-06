<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { authAPI } from '@/api'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()

const signPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const settingPwd = ref(false)
const changingPwd = ref(false)

async function handleSetPassword() {
  if (!signPassword.value) {
    ElMessage.warning('请输入签名密码')
    return
  }
  settingPwd.value = true
  try {
    await authAPI.setSignPassword(signPassword.value)
    ElMessage.success('签名密码设置成功')
    signPassword.value = ''
    userStore.hasSignPassword = true
    localStorage.setItem('hasSignPassword', 'true')
  } catch (e) {   }
  finally { settingPwd.value = false }
}

async function handleChangePassword() {
  if (newPassword.value !== confirmPassword.value) {
    ElMessage.warning('两次密码不一致')
    return
  }
  changingPwd.value = true
  try {
    await authAPI.changeSignPassword(signPassword.value, newPassword.value)
    ElMessage.success('签名密码修改成功')
    signPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {   }
  finally { changingPwd.value = false }
}
</script>

<template>
  <div class="settings-card-wrapper">
    <el-card shadow="never" class="settings-card">
      <template #header><span class="card-title">签名密码</span></template>
      <el-form v-if="!userStore.hasSignPassword" label-position="top" style="max-width: 480px">
        <el-form-item label="签名密码">
          <el-input v-model="signPassword" type="password" show-password placeholder="设置签名密码（用于签署时解锁签名材料）" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="settingPwd" @click="handleSetPassword">设置</el-button>
        </el-form-item>
      </el-form>
      <el-form v-else label-position="top" style="max-width: 480px">
        <el-form-item label="当前签名密码">
          <el-input v-model="signPassword" type="password" show-password placeholder="请输入当前签名密码" />
        </el-form-item>
        <el-form-item label="新签名密码">
          <el-input v-model="newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="changingPwd" @click="handleChangePassword">修改</el-button>
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
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--srs-text-primary);
}
</style>