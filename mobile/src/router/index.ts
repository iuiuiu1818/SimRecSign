import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MobileLayout from '@/layout/MobileLayout.vue'
import { usePermissionStore } from '@/stores/permission'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    noAuth?: boolean
    hideTabBar?: boolean
    transition?: string
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
    component: MobileLayout,
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
        path: 'documents',
        name: 'Documents',
        component: () => import('@/views/DocumentList.vue'),
        meta: { title: '我的文档' },
      },
      {
        path: 'documents/:id',
        name: 'DocumentDetail',
        component: () => import('@/views/DocumentDetail.vue'),
        meta: { title: '文档详情', hideTabBar: true, transition: 'slide-forward' },
      },
      {
        path: 'documents/:id/fill',
        name: 'DocumentFill',
        component: () => import('@/views/DocumentFill.vue'),
        meta: { title: '填写', hideTabBar: true, transition: 'slide-forward' },
      },
      {
        path: 'sign/:docId?',
        name: 'SignPad',
        component: () => import('@/views/SignPad.vue'),
        meta: { title: '签名', hideTabBar: true, transition: 'slide-forward' },
      },
      {
        path: 'documents/:id/pdf',
        name: 'PdfViewer',
        component: () => import('@/views/PdfViewer.vue'),
        meta: { title: 'PDF 查看', hideTabBar: true, transition: 'slide-forward' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/ProfilePage.vue'),
        meta: { title: '我的' },
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/views/NotificationList.vue'),
        meta: { title: '通知中心', hideTabBar: true },
      },
      {
        path: 'settings',
        redirect: 'profile',
        meta: { title: '个人设置', hideTabBar: true, transition: 'slide-forward' },
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
    ],
  },
]

const router = createRouter({
  history: createWebHistory('/m/'),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const token = localStorage.getItem('token')

  if (to.meta.noAuth) {
    next()
    return
  }

  if (!token) {
    next('/login')
    return
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