<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { ElButton } from 'element-plus'

const hasError = ref(false)
const errorMessage = ref('')

onErrorCaptured((err: Error) => {
  hasError.value = true
  errorMessage.value = err.message || '发生未知错误'
  console.error('[ErrorBoundary]', err)
  return false
})

function handleRetry() {
  hasError.value = false
  errorMessage.value = ''
}
function handleReload() {
  window.location.reload()
}
</script>

<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-content">
      <el-icon size="48" color="#F56C6C"><WarningFilled /></el-icon>
      <h2>页面渲染出错</h2>
      <p class="error-msg">{{ errorMessage }}</p>
      <el-button type="primary" @click="handleRetry">重试</el-button>
      <el-button @click="handleReload">刷新页面</el-button>
    </div>
  </div>
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 48px;
}
.error-content {
  text-align: center;
  max-width: 400px;
}
.error-content h2 {
  color: #303133;
  font-size: 20px;
  margin: 16px 0 8px;
}
.error-msg {
  color: #909399;
  font-size: 14px;
  margin-bottom: 24px;
  word-break: break-word;
}
</style>
