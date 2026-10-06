<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { userAPI } from '@/api'
import { showToast } from 'vant'

function validateEmail(v: string): boolean {
  if (!v) return true
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    showToast('邮箱格式不正确')
    return false
  }
  return true
}

const name = ref('')
const email = ref('')
const loading = ref(false)

onMounted(async () => {
  try {
    const res: any = await userAPI.getMe()
    const data = res.data || res
    name.value = data.name || ''
    email.value = data.email || ''
  } catch {   }
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
    loading.value = false
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
  </div>
</template>

<style scoped>
.btn-wrapper { padding: 24px 16px; }
</style>