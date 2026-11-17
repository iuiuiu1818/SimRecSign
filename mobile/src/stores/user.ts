import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authAPI } from '@/api'
import { usePermissionStore } from '@/stores/permission'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userId = ref(localStorage.getItem('userId') || '')
  const userName = ref(localStorage.getItem('userName') || '')
  const tenantId = ref(localStorage.getItem('tenantId') || '')
  const phone = ref(localStorage.getItem('phone') || '')
  const roles = ref<string[]>(JSON.parse(localStorage.getItem('roles') || '[]'))
  const hasSignPassword = ref(localStorage.getItem('hasSignPassword') === 'true')
  const hasSignatureImage = ref(localStorage.getItem('hasSignatureImage') === 'true')
  const hasCertificate = ref(localStorage.getItem('hasCertificate') === 'true')

  function applyLoginData(data: any, persistAssets = false) {
    token.value = data.token
    userId.value = data.userId
    userName.value = data.userName
    tenantId.value = data.tenantId
    phone.value = data.phone || ''
    roles.value = data.roles || []

    localStorage.setItem('token', data.token)
    localStorage.setItem('userId', data.userId)
    localStorage.setItem('userName', data.userName)
    localStorage.setItem('tenantId', data.tenantId)
    localStorage.setItem('phone', data.phone || '')
    localStorage.setItem('roles', JSON.stringify(data.roles || []))

    if (persistAssets) {
      hasSignPassword.value = data.hasSignPassword || false
      hasSignatureImage.value = data.hasSignatureImage || false
      hasCertificate.value = data.hasCertificate || false
      localStorage.setItem('hasSignPassword', String(data.hasSignPassword || false))
      localStorage.setItem('hasSignatureImage', String(data.hasSignatureImage || false))
      localStorage.setItem('hasCertificate', String(data.hasCertificate || false))
    }
  }

  async function login(email: string, password: string, loginTenantId?: string) {
    const res: any = await authAPI.login({ email, password, tenantId: loginTenantId })
    applyLoginData(res.data, true)

    const permStore = usePermissionStore()
    await permStore.loadPermissions()
  }

  async function register(email: string, password: string, name: string, regTenantId?: string) {
    const res: any = await authAPI.register({ email, password, name, tenantId: regTenantId })
    applyLoginData(res.data, true)

    const permStore = usePermissionStore()
    await permStore.loadPermissions()
  }

  async function loginByPhone(phoneNumber: string, password?: string, code?: string, loginTenantId?: string) {
    const res: any = await authAPI.loginByPhone({ phone: phoneNumber, password, code, tenantId: loginTenantId })
    applyLoginData(res.data, true)

    const permStore = usePermissionStore()
    await permStore.loadPermissions()
  }

  async function registerByPhone(phoneNumber: string, code: string, password: string, name: string, regTenantId?: string) {
    const res: any = await authAPI.registerByPhone({ phone: phoneNumber, code, password, name, tenantId: regTenantId })
    applyLoginData(res.data, true)

    const permStore = usePermissionStore()
    await permStore.loadPermissions()
  }

  function logout() {
    token.value = ''
    userId.value = ''
    userName.value = ''
    tenantId.value = ''
    phone.value = ''
    roles.value = []
    hasSignPassword.value = false
    hasSignatureImage.value = false
    hasCertificate.value = false
    localStorage.clear()

    const permStore = usePermissionStore()
    permStore.reset()
  }

  return {
    token, userId, userName, tenantId, phone, roles, hasSignPassword,
    hasSignatureImage, hasCertificate,
    login, register, loginByPhone, registerByPhone, logout,
  }
})
