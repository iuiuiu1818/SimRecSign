<template>
  <div class="handoff-container">
    <header class="handoff-header">
      <span class="brand">简录签</span>
    </header>
    <main class="handoff-main">
      <div class="handoff-card">

        <template v-if="!userStore.token">
          <div class="icon-wrapper">
            <el-icon :size="48" color="#409EFF"><Link /></el-icon>
          </div>
          <h2 class="card-title">交接链接</h2>
          <p class="card-desc">您收到了一份文档交接邀请，请登录后完成交接。</p>
          <el-button type="primary" size="large" @click="goLogin" class="action-btn">
            去登录
          </el-button>
        </template>

        <template v-else-if="binding">
          <div class="icon-wrapper">
            <el-icon :size="48" color="#409EFF" class="is-loading"><Loading /></el-icon>
          </div>
          <h2 class="card-title">正在交接...</h2>
          <p class="card-desc">请稍候，正在为您完成交接绑定。</p>
        </template>

        <template v-else-if="boundSuccess">
          <div class="icon-wrapper">
            <el-icon :size="48" color="#67C23A"><CircleCheckFilled /></el-icon>
          </div>
          <h2 class="card-title">交接成功</h2>
          <p class="card-desc">已交接给 <strong>{{ userStore.userName }}</strong></p>
          <el-button type="primary" size="large" @click="goFill" class="action-btn">
            去填写
          </el-button>
        </template>

        <template v-else-if="boundError">
          <div class="icon-wrapper">
            <el-icon :size="48" color="#F56C6C"><CircleCloseFilled /></el-icon>
          </div>
          <h2 class="card-title">交接失败</h2>
          <p class="card-desc">{{ errorMessage }}</p>
          <el-button type="primary" size="large" @click="retryBind" class="action-btn">
            重试
          </el-button>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { handoffAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { Link, Loading, CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const token = route.params.token as string
const binding = ref(false)
const boundSuccess = ref(false)
const boundError = ref(false)
const errorMessage = ref('')

function goLogin() {
  router.push({ path: '/login', query: { redirect: route.fullPath } })
}

function goFill() {
  const docId = sessionStorage.getItem('handoffDocumentId')
  if (docId) {
    router.push({ path: `/documents/${docId}/fill` })
  } else {
    router.push({ path: '/dashboard' })
  }
}

function retryBind() {
  boundError.value = false
  errorMessage.value = ''
  doBind()
}

async function doBind() {
  binding.value = true
  try {
    const res: any = await handoffAPI.bind(token)
    boundSuccess.value = true
    if (res.data?.documentId) {
      sessionStorage.setItem('handoffDocumentId', res.data.documentId)
    }
  } catch (e: any) {
    boundError.value = true
    errorMessage.value = e?.response?.data?.msg || e.message || '交接失败，请重试'
  } finally {
    binding.value = false
  }
}

onMounted(() => {
  if (userStore.token) {
    doBind()
  }
})
</script>

<style scoped>
.handoff-container {
  min-height: 100vh;
  background: var(--srs-bg-page);
  display: flex;
  flex-direction: column;
}

.handoff-header {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: var(--srs-bg-header);
  border-bottom: 1px solid var(--srs-border);
}

.brand {
  font-size: 18px;
  font-weight: 600;
  color: var(--srs-text-primary);
}

.handoff-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.handoff-card {
  width: 100%;
  max-width: 480px;
  background: var(--srs-bg-card);
  border-radius: var(--srs-radius-lg);
  box-shadow: var(--srs-shadow-md);
  padding: 48px 40px;
  text-align: center;
  border: 1px solid var(--srs-border);
}

.icon-wrapper {
  margin-bottom: 20px;
}

.is-loading {
  animation: rotating 1.5s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--srs-text-primary);
  margin: 0 0 12px;
}

.card-desc {
  font-size: 14px;
  color: var(--srs-text-tertiary);
  margin: 0 0 32px;
  line-height: 1.6;
}

.action-btn {
  min-width: 160px;
}
</style>