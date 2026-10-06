import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authAPI } from '@/api'
import { usePermissionStore } from '@/stores/permission'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userId = ref(localStorage.getItem('userId') || '')
  const userName = ref(localStorage.getItem('userName') || '')
  const tenantId = ref(localStorage.getItem('tenantId') || '')
  const roles = ref<string[]>(JSON.parse(localStorage.getItem('roles') || '[]'))
  const hasSignPassword = ref(localStorage.getItem('hasSignPassword') === 'true')
  const hasSignatureImage = ref(localStorage.getItem('hasSignatureImage') === 'true')
  const hasCertificate = ref(localStorage.getItem('hasCertificate') === 'true')

  async function login(email: string, password: string, loginTenantId?: string) {
    const res: any = await authAPI.login({ email, password, tenantId: loginTenantId })
    const data = res.data
    token.value = data.token
    userId.value = data.userId
    userName.value = data.userName
    tenantId.value = data.tenantId
    roles.value = data.roles || []
    hasSignPassword.value = data.hasSignPassword
    hasSignatureImage.value = data.hasSignatureImage
    hasCertificate.value = data.hasCertificate

    localStorage.setItem('token', data.token)
    localStorage.setItem('userId', data.userId)
    localStorage.setItem('userName', data.userName)
    localStorage.setItem('tenantId', data.tenantId)
    localStorage.setItem('roles', JSON.stringify(data.roles || []))
    localStorage.setItem('hasSignPassword', String(data.hasSignPassword))
    localStorage.setItem('hasSignatureImage', String(data.hasSignatureImage))
    localStorage.setItem('hasCertificate', String(data.hasCertificate))

    const permStore = usePermissionStore()
    await permStore.loadPermissions()
  }

  async function register(email: string, password: string, name: string, regTenantId?: string) {
    const res: any = await authAPI.register({ email, password, name, tenantId: regTenantId })
    const data = res.data
    token.value = data.token
    userId.value = data.userId
    userName.value = data.userName
    tenantId.value = data.tenantId
    roles.value = data.roles || []
    hasSignPassword.value = data.hasSignPassword || false
    hasSignatureImage.value = data.hasSignatureImage || false
    hasCertificate.value = data.hasCertificate || false

    localStorage.setItem('token', data.token)
    localStorage.setItem('userId', data.userId)
    localStorage.setItem('userName', data.userName)
    localStorage.setItem('tenantId', data.tenantId)
    localStorage.setItem('roles', JSON.stringify(data.roles || []))
    localStorage.setItem('hasSignPassword', String(data.hasSignPassword || false))
    localStorage.setItem('hasSignatureImage', String(data.hasSignatureImage || false))
    localStorage.setItem('hasCertificate', String(data.hasCertificate || false))

    const permStore = usePermissionStore()
    await permStore.loadPermissions()
  }

  function logout() {
    token.value = ''
    userId.value = ''
    userName.value = ''
    tenantId.value = ''
    roles.value = []
    hasSignPassword.value = false
    hasSignatureImage.value = false
    hasCertificate.value = false
    localStorage.clear()

    const permStore = usePermissionStore()
    permStore.reset()
  }

  return {
    token, userId, userName, tenantId, roles, hasSignPassword,
    hasSignatureImage, hasCertificate,
    login, register, logout,
  }
})