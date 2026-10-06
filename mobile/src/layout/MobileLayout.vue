<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useDarkMode } from '@/composables/useDarkMode'
import { BaseIcon } from '@/components'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { isDark, toggle: toggleDark } = useDarkMode()

const activeTab = computed(() => {
  const path = route.path
  if (path.startsWith('/dashboard')) return 0
  if (path.startsWith('/templates')) return 1
  if (path.startsWith('/documents')) return 2
  if (path.startsWith('/profile') || path.startsWith('/settings') || path.startsWith('/notifications')) return 3
  return 0
})

const hideTabBar = computed(() => {
  return route.meta?.hideTabBar === true
})

function onTabChange(index: number) {
  const paths = ['/dashboard', '/templates', '/documents', '/profile']
  if (index >= 0 && index < paths.length) {
    router.push(paths[index])
  }
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="mobile-layout">

    <van-nav-bar
      :title="route.meta?.title as string || '简录签'"
      left-arrow
      @click-left="router.back()"
      class="app-nav-bar"
    >
      <template #right>
        <BaseIcon
          :name="isDark ? 'sun' : 'moon'"
          :size="20"
          @click="toggleDark"
          class="dark-toggle"
          color="var(--srs-text-primary)"
        />
      </template>
    </van-nav-bar>

    <div class="app-content" :class="{ 'has-tabbar': !hideTabBar }">
      <router-view />
    </div>

    <van-tabbar
      v-if="!hideTabBar"
      v-model="activeTab"
      @change="onTabChange"
      active-color="var(--srs-primary)"
      inactive-color="var(--srs-text-tertiary)"
      safe-area-inset-bottom
    >
      <van-tabbar-item>
        <template #icon="props">
          <BaseIcon :name="props.active ? 'home' : 'home'" :size="20" />
        </template>
        工作台
      </van-tabbar-item>
      <van-tabbar-item>
        <template #icon="props">
          <BaseIcon :name="props.active ? 'template' : 'template'" :size="20" />
        </template>
        模板库
      </van-tabbar-item>
      <van-tabbar-item>
        <template #icon="props">
          <BaseIcon :name="props.active ? 'document' : 'document'" :size="20" />
        </template>
        文档
      </van-tabbar-item>
      <van-tabbar-item>
        <template #icon="props">
          <BaseIcon :name="props.active ? 'user' : 'user'" :size="20" />
        </template>
        我的
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.mobile-layout {
  min-height: 100vh;
  background: var(--srs-bg-page);
}

.app-nav-bar {
  --van-nav-bar-height: 46px;
  --van-nav-bar-background: var(--srs-bg-header);
  border-bottom: 1px solid var(--srs-border-light);
}

.app-nav-bar::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--srs-primary-border), transparent);
  opacity: 0.6;
}

.app-content {
  padding-top: 46px;
  min-height: calc(100vh - 46px);
}

.app-content.has-tabbar {
  padding-bottom: 50px;
  min-height: calc(100vh - 46px - 50px);
}

.dark-toggle {
  padding: 4px;
}

:deep(.van-tabbar-item--active) {
  font-weight: 600;
}
</style>