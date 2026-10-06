<script setup lang="ts">
import { ref } from 'vue'
import { authAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { showToast } from 'vant'

const userStore = useUserStore()
const loading = ref(false)

const password = ref('')
const confirmPassword = ref('')
const oldPassword = ref('')

const isSet = ref(userStore.hasSignPassword)

async function handleSet() {
  if (isSet.value && !oldPassword.value) { showToast('请输入旧签名密码'); return }
  if (!password.value || password.value.length < 6) { showToast('密码至少6位'); return }
  if (password.value !== confirmPassword.value) { showToast('两次密码不一致'); return }
  loading.value = true
  try {
    if (isSet.value) {
      await authAPI.changeSignPassword(oldPassword.value, password.value)
    } else {
      await authAPI.setSignPassword(password.value)
    }
    showToast(isSet.value ? '修改成功' : '设置成功')
    userStore.hasSignPassword = true
    isSet.value = true
    password.value = ''
    confirmPassword.value = ''
    oldPassword.value = ''
  } catch (e: any) {
    showToast(e?.message || '操作失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <van-form @submit="handleSet">
      <van-cell-group inset>
        <template v-if="isSet">
          <van-field v-model="oldPassword" label="旧密码" type="password" placeholder="请输入旧签名密码" :rules="[{ required: true, message: '请输入旧密码' }]" />
        </template>
        <van-field v-model="password" label="新密码" type="password" :placeholder="isSet ? '请输入新密码' : '请设置签名密码（至少6位）'" :rules="[{ required: true, message: '请输入密码' }]" />
        <van-field v-model="confirmPassword" label="确认密码" type="password" placeholder="再次输入密码" :rules="[{ required: true, message: '请确认密码' }]" />
      </van-cell-group>
      <div class="btn-wrapper">
        <van-button round block type="primary" native-type="submit" :loading="loading" loading-text="提交中...">
          {{ isSet ? '修改签名密码' : '设置签名密码' }}
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<style scoped>
.btn-wrapper { padding: 24px 16px; }
</style>