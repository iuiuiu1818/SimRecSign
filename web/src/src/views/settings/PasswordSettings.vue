<script setup lang="ts">
import { ref } from 'vue'
import { userAPI } from '@/api'
import { ElMessage } from 'element-plus'

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const saving = ref(false)

async function handleSave() {
  if (!oldPassword.value) { ElMessage.warning('请输入当前密码'); return }
  if (!newPassword.value) { ElMessage.warning('请输入新密码'); return }
  if (newPassword.value !== confirmPassword.value) { ElMessage.warning('两次密码不一致'); return }
  saving.value = true
  try {
    await userAPI.changePassword({ oldPassword: oldPassword.value, newPassword: newPassword.value })
    ElMessage.success('密码修改成功')
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch {   }
  finally { saving.value = false }
}
</script>

<template>
  <div class="settings-card-wrapper">
    <el-card shadow="never" class="settings-card">
      <template #header><span class="card-title">修改登录密码</span></template>
      <el-form label-position="top" style="max-width: 480px">
        <el-form-item label="当前密码">
          <el-input v-model="oldPassword" type="password" show-password placeholder="请输入当前密码" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">修改</el-button>
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