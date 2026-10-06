import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layout/AppLayout.vue'
import { usePermissionStore } from '@/stores/permission'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    noAuth?: boolean
    permission?: string | string[]
    role?: string | string[]
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', noAuth: true },
  },
  {
    path: '/handoff/:token',
    name: 'HandoffLink',
    component: () => import('@/views/HandoffLink.vue'),
    meta: { title: '交接链接', noAuth: true },
  },
  {
    path: '/',
    component: AppLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '工作台' },
      },
      {
        path: 'templates',
        name: 'Templates',
        component: () => import('@/views/TemplateList.vue'),
        meta: { title: '模板库' },
      },
      {
        path: 'templates/:id',
        name: 'TemplateEditor',
        component: () => import('@/views/TemplateEditor.vue'),
        meta: { title: '编辑模板' },
      },
      {
        path: 'documents',
        name: 'Documents',
        component: () => import('@/views/DocumentList.vue'),
        meta: { title: '我的文档' },
      },
      {
        path: 'documents/:id',
        name: 'DocumentDetail',
        component: () => import('@/views/DocumentDetail.vue'),
        meta: { title: '文档详情' },
      },
      {
        path: 'documents/:id/fill',
        name: 'DocumentFill',
        component: () => import('@/views/DocumentFill.vue'),
        meta: { title: '填写' },
      },
      {
        path: 'settings',
        component: () => import('@/views/Settings.vue'),
        redirect: '/settings/profile',
        meta: { title: '个人设置' },
        children: [
          {
            path: 'profile',
            name: 'SettingsProfile',
            component: () => import('@/views/settings/ProfileSettings.vue'),
            meta: { title: '个人信息' },
          },
          {
            path: 'password',
            name: 'SettingsPassword',
            component: () => import('@/views/settings/PasswordSettings.vue'),
            meta: { title: '修改密码' },
          },
          {
            path: 'sign-password',
            name: 'SettingsSignPassword',
            component: () => import('@/views/settings/SignPasswordSettings.vue'),
            meta: { title: '签名密码' },
          },
          {
            path: 'signature',
            name: 'SettingsSignature',
            component: () => import('@/views/settings/SignatureSettings.vue'),
            meta: { title: '我的签名' },
          },
          {
            path: 'certificate',
            name: 'SettingsCertificate',
            component: () => import('@/views/settings/CertificateSettings.vue'),
            meta: { title: '我的证书' },
          },
        ],
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/views/NotificationList.vue'),
        meta: { title: '通知中心' },
      },
      {
        path: 'admin',
        component: () => import('@/views/admin/AdminLayout.vue'),
        redirect: '/admin/users',
        meta: { title: '系统管理', role: ['super_admin', 'org_admin'] },
        children: [
          {
            path: 'users',
            name: 'AdminUsers',
            component: () => import('@/views/admin/UserManagement.vue'),
            meta: { title: '用户管理', permission: 'user:read' },
          },
          {
            path: 'departments',
            name: 'AdminDepartments',
            component: () => import('@/views/admin/DepartmentManagement.vue'),
            meta: { title: '部门管理', permission: 'department:read' },
          },
          {
            path: 'roles',
            name: 'AdminRoles',
            component: () => import('@/views/admin/RoleManagement.vue'),
            meta: { title: '角色管理', permission: 'role:read' },
          },
          {
            path: 'categories',
            name: 'AdminCategories',
            component: () => import('@/views/admin/CategoryManagement.vue'),
            meta: { title: '模板分类' },
          },
          {
            path: 'tenants',
            name: 'AdminTenants',
            component: () => import('@/views/admin/TenantManagement.vue'),
            meta: { title: '租户管理', role: ['super_admin'], permission: 'tenant:read' },
          },
          {
            path: 'certificates',
            name: 'AdminCertificates',
            component: () => import('@/views/admin/CertificateAdmin.vue'),
            meta: { title: '证书管理' },
          },
          {
            path: 'ca',
            name: 'AdminCA',
            component: () => import('@/views/admin/CAManagement.vue'),
            meta: { title: '自建 CA', permission: 'ca:read' },
          },
          {
            path: 'audit',
            name: 'AdminAudit',
            component: () => import('@/views/admin/AuditLog.vue'),
            meta: { title: '审计日志', permission: 'audit:read' },
          },
        ],
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const token = localStorage.getItem('token')
  const rolesStr = localStorage.getItem('roles')
  const roles: string[] = rolesStr ? JSON.parse(rolesStr) : []

  if (to.meta.noAuth) {
    next()
    return
  }

  if (!token) {
    next('/login')
    return
  }

  if (to.meta.role) {
    const requiredRoles = Array.isArray(to.meta.role) ? to.meta.role : [to.meta.role]
    const hasRole = requiredRoles.some(r => roles.includes(r))
    if (!hasRole) {
      next('/dashboard')
      return
    }
  }

  if (to.meta.permission) {
    const permStore = usePermissionStore()
    if (!permStore.loaded) {
      await permStore.loadPermissions()
    }
    const required = Array.isArray(to.meta.permission) ? to.meta.permission : [to.meta.permission]
    const hasPerm = required.some(code => permStore.hasPermission(code))
    if (!hasPerm) {
      next('/dashboard')
      return
    }
  }

  next()
})

export default router