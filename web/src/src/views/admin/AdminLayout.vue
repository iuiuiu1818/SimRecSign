<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePermissionStore } from '@/stores/permission'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const permStore = usePermissionStore()
const userStore = useUserStore()

const menuItems = [
  { path: '/admin/users', label: '用户管理', permission: 'user:read' },
  { path: '/admin/roles', label: '角色管理', permission: 'role:read' },
  { path: '/admin/departments', label: '部门管理', permission: 'department:read' },
  { path: '/admin/categories', label: '模板分类' },
  { path: '/admin/tenants', label: '租户管理', role: 'super_admin', permission: 'tenant:read' },
  { path: '/admin/certificates', label: '证书管理' },
  { path: '/admin/ca', label: '自建 CA', permission: 'ca:read' },
  { path: '/admin/audit', label: '审计日志', permission: 'audit:read' },
]

function isVisible(item: typeof menuItems[0]): boolean {
  if (item.role && !userStore.roles.includes(item.role)) return false
  if (item.permission && !permStore.hasPermission(item.permission)) return false
  return true
}

const visibleMenuItems = computed(() => {
  void permStore.permissions
  void permStore.loaded
  return menuItems.filter(isVisible)
})
</script>

<template>
  <div class="admin-page">
    <h2 class="page-title">系统管理</h2>
    <el-row :gutter="20">
      <el-col :xs="24" :sm="4">
        <el-menu :default-active="route.path" router class="admin-menu">
          <el-menu-item v-for="item in visibleMenuItems" :key="item.path" :index="item.path">
            {{ item.label }}
          </el-menu-item>
        </el-menu>
      </el-col>
      <el-col :xs="24" :sm="18">
        <router-view />
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.admin-page {

  margin: 0 auto;
}
.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--srs-text-primary);
  margin: 0 0 24px;
}
.admin-menu {
  border-right: none;
  border-radius: 8px;
  background: var(--srs-bg-card);
  border: 1px solid var(--srs-border);
}
.admin-menu .el-menu-item {
  height: 44px;
  line-height: 44px;
}
.admin-menu .el-menu-item.is-active {
  background-color: var(--srs-primary-bg);
  color: var(--srs-primary);
  font-weight: 500;
}
</style>