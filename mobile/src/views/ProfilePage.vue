<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { notificationAPI, userAPI } from '@/api'
import { showToast, showDialog } from 'vant'
import {
  IconBell, IconUser, IconPen,
  IconSignature, IconPen as IconSignPassword, IconCertificate,
  IconArrowRight, IconLogo,
} from '@/components'

const router = useRouter()
const userStore = useUserStore()

const unreadCount = ref(0)
const profile = ref({ name: '', email: '' })

onMounted(async () => {
  try {
    const res: any = await notificationAPI.unreadCount()
    unreadCount.value = res.data?.count || 0
  } catch {   }

  try {
    const res: any = await userAPI.getMe()
    const data = res.data || res
    profile.value.name = data.name || userStore.userName || ''
    profile.value.email = data.email || ''
  } catch {
    profile.value.name = userStore.userName || ''
  }
})

const menus = [
  { label: '个人信息', desc: '姓名、邮箱', icon: IconUser, color: 'var(--srs-primary)', bg: 'var(--srs-primary-bg)', path: '/settings/profile' },
  { label: '修改密码', desc: '登录密码', icon: IconPen, color: 'var(--srs-warning)', bg: 'var(--srs-warning-bg)', path: '/settings/password' },
  { label: '签名密码', desc: '签署校验', icon: IconPen, color: 'var(--srs-accent-violet)', bg: 'var(--srs-accent-violet-bg)', path: '/settings/sign-password' },
  { label: '我的签名', desc: '手写签名管理', icon: IconSignature, color: 'var(--srs-accent-cyan)', bg: 'var(--srs-accent-cyan-bg)', path: '/settings/signature' },
  { label: '我的证书', desc: '数字证书', icon: IconCertificate, color: 'var(--srs-accent-amber)', bg: 'var(--srs-accent-amber-bg)', path: '/settings/certificate' },
]

async function handleLogout() {
  try {
    await showDialog({
      title: '退出登录',
      message: '确定要退出当前账号吗？',
      showCancelButton: true,
      confirmButtonText: '退出',
    })
  } catch { return }
  userStore.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="page-container profile-page">

    <div class="profile-header">
      <div class="avatar">
        <IconLogo :size="34" color="var(--srs-primary)" />
      </div>
      <div class="profile-info">
        <div class="profile-name">{{ profile.name || '未设置姓名' }}</div>
        <div class="profile-email muted">{{ profile.email || '未绑定邮箱' }}</div>
      </div>
      <IconArrowRight :size="18" color="var(--srs-text-tertiary)" @click="router.push('/settings/profile')" class="profile-edit" />
    </div>

    <div class="notice-cell" @click="router.push('/notifications')">
      <div class="notice-icon" style="background: var(--srs-accent-rose-bg)">
        <IconBell :size="22" color="var(--srs-accent-rose)" />
      </div>
      <div class="notice-label">通知中心</div>
      <div class="notice-badge" v-if="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}条未读</div>
      <IconArrowRight :size="18" color="var(--srs-text-tertiary)" />
    </div>

    <div class="menu-group">
      <van-cell-group inset>
        <van-cell
          v-for="m in menus"
          :key="m.path"
          :title="m.label"
          :label="m.desc"
          is-link
          @click="router.push(m.path)"
        >
          <template #icon>
            <div class="menu-icon" :style="{ background: m.bg, color: m.color }">
              <component :is="m.icon" :size="18" :color="m.color" />
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <div class="logout-wrapper">
      <van-button round block plain type="danger" @click="handleLogout">退出登录</van-button>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  padding: 16px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
  background: linear-gradient(160deg, var(--srs-primary-bg) 0%, var(--srs-bg-card) 75%);
  border: 1px solid var(--srs-primary-border);
  border-radius: var(--srs-radius-xl);
  padding: 20px 16px;
  margin-bottom: 12px;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--srs-bg-card);
  border: 2px solid var(--srs-primary-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-size: 17px;
  font-weight: 700;
  color: var(--srs-text-primary);
}

.profile-email {
  font-size: 13px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-edit {
  flex-shrink: 0;
  padding: 4px;
}

.notice-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--srs-bg-card);
  border: 1px solid var(--srs-border);
  border-radius: var(--srs-radius-lg);
  padding: 14px 16px;
  margin-bottom: 12px;
  transition: transform var(--srs-transition-fast) ease;
}

.notice-cell:active {
  transform: scale(0.98);
}

.notice-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notice-label {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
}

.notice-badge {
  font-size: 12px;
  color: var(--srs-accent-rose);
  background: var(--srs-accent-rose-bg);
  border-radius: 10px;
  padding: 2px 8px;
}

.menu-group {
  margin-bottom: 12px;
}

.menu-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.logout-wrapper {
  padding: 24px 0;
}
</style>