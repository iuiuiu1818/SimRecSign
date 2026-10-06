<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { handoffAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { showToast, showConfirmDialog } from 'vant'
import { BaseIcon, IconLink, IconCheck, IconError } from '@/components'

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
    showToast('交接成功')
  } catch (e: any) {
    boundError.value = true
    errorMessage.value = e?.response?.data?.msg || e.message || '交接失败，请重试'
  } finally {
    binding.value = false
  }
}

onMounted(async () => {
  if (userStore.token && token) {
    try {
      await showConfirmDialog({
        title: '交接确认',
        message: '您收到了一份文档交接邀请，是否确认接收？',
        confirmButtonText: '确认接收',
        cancelButtonText: '取消',
      })
      doBind()
    } catch {
    }
  }
})
</script>

<template>
  <div class="handoff-page">
    <div class="handoff-card">

      <template v-if="!userStore.token">
        <IconLink :size="48" color="var(--srs-primary)" />
        <h2 class="card-title">交接链接</h2>
        <p class="card-desc">您收到了一份文档交接邀请，请登录后完成交接。</p>
        <van-button type="primary" round block @click="goLogin" class="action-btn">
          去登录
        </van-button>
      </template>

      <template v-else-if="binding">
        <van-loading size="48" color="var(--srs-primary)" />
        <h2 class="card-title">正在交接...</h2>
        <p class="card-desc">请稍候，正在为您完成交接绑定。</p>
      </template>

      <template v-else-if="boundSuccess">
        <IconCheck :size="48" color="var(--srs-success)" />
        <h2 class="card-title">交接成功</h2>
        <p class="card-desc">已交接给 <strong>{{ userStore.userName }}</strong></p>
        <van-button type="primary" round block @click="goFill" class="action-btn">
          去填写
        </van-button>
      </template>

      <template v-else-if="boundError">
        <IconError :size="48" color="var(--srs-danger)" />
        <h2 class="card-title">交接失败</h2>
        <p class="card-desc">{{ errorMessage }}</p>
        <van-button type="primary" round block @click="retryBind" class="action-btn">
          重试
        </van-button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.handoff-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--srs-bg-page);
}

.handoff-card {
  width: 100%;
  max-width: 400px;
  background: var(--srs-bg-card);
  border-radius: var(--srs-radius-xl);
  box-shadow: var(--srs-shadow-md);
  padding: 40px 24px;
  text-align: center;
  border: 1px solid var(--srs-border);
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--srs-text-primary);
  margin: 16px 0 8px;
}

.card-desc {
  font-size: 14px;
  color: var(--srs-text-tertiary);
  margin: 0 0 24px;
  line-height: 1.6;
}

.action-btn {
  margin-top: 8px;
}
</style>