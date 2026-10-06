<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { userAPI } from '@/api'
import { showToast, showDialog } from 'vant'

const router = useRouter()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)

async function handleSave() {
  if (!oldPassword.value) { showToast('请输入旧密码'); return }
  if (!newPassword.value || newPassword.value.length < 6) { showToast('新密码至少6位'); return }
  if (newPassword.value !== confirmPassword.value) { showToast('两次密码不一致'); return }
  loading.value = true
  try {
    await userAPI.changePassword({ oldPassword: oldPassword.value, newPassword: newPassword.value })
    showToast('修改成功，请重新登录')
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    router.replace('/login')
  } catch (e: any) {
    showToast(e?.message || '修改失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <van-form @submit="handleSave">
      <van-cell-group inset>
        <van-field v-model="oldPassword" label="旧密码" type="password" placeholder="请输入旧密码" :rules="[{ required: true, message: '请输入旧密码' }]" />
        <van-field v-model="newPassword" label="新密码" type="password" placeholder="至少6位" :rules="[{ required: true, message: '请输入新密码' }]" />
        <van-field v-model="confirmPassword" label="确认密码" type="password" placeholder="再次输入新密码" :rules="[{ required: true, message: '请确认新密码' }]" />
      </van-cell-group>
      <div class="btn-wrapper">
        <van-button round block type="primary" native-type="submit" :loading="loading" loading-text="提交中...">修改密码</van-button>
      </div>
    </van-form>
  </div>
</template>

<style scoped>
.btn-wrapper { padding: 24px 16px; }
</style>