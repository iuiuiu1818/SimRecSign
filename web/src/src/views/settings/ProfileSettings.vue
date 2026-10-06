<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { userAPI } from '@/api'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const name = ref(userStore.userName)
const email = ref('')
const saving = ref(false)

onMounted(async () => {
  try {
    const res: any = await userAPI.getMe()
    const data = res.data
    name.value = data.name || ''
    email.value = data.email || ''
  } catch {   }
})

async function handleSave() {
  saving.value = true
  try {
    await userAPI.updateMe({ name: name.value, email: email.value })
    ElMessage.success('保存成功')
  } catch {   }
  finally { saving.value = false }
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