import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/api'

export const usePermissionStore = defineStore('permission', () => {
  const permissions = ref<string[]>([])
  const loaded = ref(false)

  async function loadPermissions() {
    try {
      const res: any = await http.get('/auth/permissions')
      permissions.value = res.data?.permissions || []
      loaded.value = true
    } catch {
      permissions.value = []
      loaded.value = true
    }
  }

  function hasPermission(code: string): boolean {
    if (!code) return true
    const module = code.split(':')[0]
    return permissions.value.some(p => p === code || p === `${module}:*`)
  }

  function hasAnyPermission(codes: string[]): boolean {
    return codes.some(code => hasPermission(code))
  }

  function hasAllPermissions(codes: string[]): boolean {
    return codes.every(code => hasPermission(code))
  }

  function reset() {
    permissions.value = []
    loaded.value = false
  }

  return {
    permissions, loaded,
    loadPermissions, hasPermission, hasAnyPermission, hasAllPermissions, reset,
  }
})