<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { notificationAPI } from '@/api'
import { useDarkMode } from '@/composables/useDarkMode'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const permStore = usePermissionStore()
const { isDark, toggle: toggleDark } = useDarkMode()

const isCollapse = ref(false)
const unreadCount = ref(0)
const mobileMenuVisible = ref(false)

const isAdmin = computed(() => {
  return userStore.roles.some((r: string) => ['super_admin', 'org_admin'].includes(r))
})

const showAdmin = computed(() => {
  void permStore.permissions
  void permStore.loaded
  return isAdmin.value || permStore.hasAnyPermission(['user:read', 'department:read', 'tenant:read', 'audit:read'])
})

const menuItems = [
  { path: '/dashboard', icon: 'Odometer', label: '工作台' },
  { path: '/templates', icon: 'DocumentCopy', label: '模板库' },
  { path: '/documents', icon: 'Document', label: '我的文档' },
  { path: '/notifications', icon: 'Bell', label: '通知中心' },
  { path: '/settings', icon: 'Setting', label: '个人设置' },
]

const breadcrumbs = computed(() => {
  const crumbs: { label: string; path?: string }[] = []
  const matched = route.matched.filter(r => r.meta?.title)
  for (let i = 0; i < matched.length; i++) {
    crumbs.push({
      label: matched[i].meta.title as string,
      path: i < matched.length - 1 ? matched[i].path : undefined,
    })
  }
  return crumbs
})

async function loadUnreadCount() {
  try {
    const res: any = await notificationAPI.unreadCount()
    unreadCount.value = res.data?.count || 0
  } catch {   }
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
}

function handleMobileMenuSelect() {
  mobileMenuVisible.value = false
}

onMounted(loadUnreadCount)
</script>

<template>
  <el-container class="app-container">

    <el-aside :width="isCollapse ? '64px' : '220px'" class="app-sidebar desktop-sidebar">
      <div class="sidebar-header">
        <span v-if="!isCollapse" class="sidebar-title">简录签</span>
        <span v-else class="sidebar-title-mini">S</span>
      </div>
      <el-menu
        :default-active="route.path"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        class="sidebar-menu"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
        <el-menu-item v-if="showAdmin" index="/admin/users">
          <el-icon><Setting /></el-icon>
          <template #title>系统管理</template>
        </el-menu-item>
      </el-menu>
      <div class="sidebar-footer">
        <div class="sidebar-collapse-btn" @click="isCollapse = !isCollapse">
          <el-icon><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
        </div>
      </div>
    </el-aside>

    <el-drawer
      v-model="mobileMenuVisible"
      direction="ltr"
      size="220px"
      :with-header="false"
      class="mobile-drawer"
    >
      <div class="sidebar-header" style="background: #1d1e1f">
        <span class="sidebar-title" style="color:#fff">简录签</span>
      </div>
      <el-menu
        :default-active="route.path"
        router
        class="sidebar-menu mobile-menu"
        @select="handleMobileMenuSelect"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
        <el-menu-item v-if="showAdmin" index="/admin/users">
          <el-icon><Setting /></el-icon>
          <template #title>系统管理</template>
        </el-menu-item>
      </el-menu>
    </el-drawer>

    <el-container class="main-container">
      <el-header class="app-header">
        <div class="header-left">

          <el-button class="mobile-menu-btn" link @click="mobileMenuVisible = true">
            <el-icon size="22"><Menu /></el-icon>
          </el-button>

          <el-breadcrumb class="app-breadcrumb">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item
              v-for="crumb in breadcrumbs"
              :key="crumb.label"
              :to="crumb.path ? { path: crumb.path } : undefined"
            >
              {{ crumb.label }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="notif-badge">
            <el-button link @click="router.push('/notifications')">
              <el-icon size="20"><Bell /></el-icon>
            </el-button>
          </el-badge>

          <el-tooltip :content="isDark ? '切换亮色模式' : '切换深色模式'">
            <el-button link class="dark-toggle-btn" @click="toggleDark">
              <el-icon :size="20">
                <Moon v-if="!isDark" />
                <Sunny v-else />
              </el-icon>
            </el-button>
          </el-tooltip>
          <el-dropdown @command="handleLogout">
            <span class="user-info">
              <el-avatar :size="32" icon="UserFilled" />
              <span class="user-name">{{ userStore.userName || '用户' }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="app-main">

        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-container {
  height: 100vh;
  overflow: hidden;
}

.app-sidebar {
  background-color: var(--srs-bg-sidebar);
  display: flex;
  flex-direction: column;
  transition: width var(--srs-transition-slow);
  overflow: hidden;
  height: 100vh;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--srs-text-inverse);
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-title-mini {
  font-size: 20px;
  font-weight: 700;
}

.sidebar-menu {
  flex: 1;
  overflow-y: auto;
  border-right: none !important;
  background: transparent !important;
}

.sidebar-menu :deep(.el-menu) {
  background: transparent !important;
}

.sidebar-menu :deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  color: #bfcbd9;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.06) !important;
  color: #fff !important;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: rgba(37, 99, 235, 0.15) !important;
  color: #60a5fa !important;
}

.sidebar-footer {
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-collapse-btn {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bfcbd9;
  cursor: pointer;
  transition: color var(--srs-transition-fast);
}

.sidebar-collapse-btn:hover {
  color: var(--srs-primary);
}

.main-container {
  height: 100vh;
  overflow: hidden;
}

.app-header {
  background: var(--srs-bg-header);
  border-bottom: 1px solid var(--srs-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  flex-shrink: 0;
  transition: background var(--srs-transition-normal), border-color var(--srs-transition-normal);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dark-toggle-btn {
  color: var(--srs-text-secondary);
  transition: color var(--srs-transition-fast);
}
.dark-toggle-btn:hover {
  color: var(--srs-primary);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-name {
  font-size: 14px;
  color: var(--srs-text-primary);
}

.app-main {
  padding: 24px;
  background: var(--srs-bg-page);
  height: calc(100vh - 60px);
  overflow-y: auto;
  overflow-x: hidden;
  transition: background var(--srs-transition-normal);
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.mobile-menu-btn {
  display: none;
}

@media (max-width: 768px) {
  .desktop-sidebar {
    display: none;
  }
  .mobile-menu-btn {
    display: inline-flex;
  }
  .app-header {
    padding: 0 12px;
  }
  .app-main {
    padding: 12px;
  }
  .user-name {
    display: none;
  }
  .app-breadcrumb {
    font-size: 13px;
  }
}

.mobile-drawer :deep(.el-drawer__body) {
  padding: 0;
}
.mobile-menu {
  border-right: none !important;
  height: 100%;
}
</style>
