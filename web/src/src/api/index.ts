import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

const http: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.config.responseType === 'blob' || response.config.responseType === 'arraybuffer') {
      return response.data
    }
    const data = response.data
    if (data.code !== 0) {
      ElMessage.error(data.msg || '请求失败')
      return Promise.reject(new Error(data.msg))
    }
    return data
  },
  (error) => {
    const url = error.config?.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register')

    if (error.response?.status === 401) {
      if (!isAuthEndpoint) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }

    if (!isAuthEndpoint) {
      const data = error.response?.data
      if (data instanceof Blob && data.type.includes('json')) {
        data.text().then((text: string) => {
          try {
            ElMessage.error(JSON.parse(text)?.msg || '网络错误')
          } catch {
            ElMessage.error('网络错误')
          }
        })
      } else {
        ElMessage.error(data?.msg || '网络错误')
      }
    }

    return Promise.reject(error)
  }
)

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default http

function saveBlobFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const authAPI = {
  register(data: { email: string; password: string; name: string; tenantId?: string }) {
    return http.post('/auth/register', data)
  },
  login(data: { email: string; password: string; tenantId?: string }) {
    return http.post('/auth/login', data)
  },
  listTenants() {
    return http.get('/auth/tenants')
  },
  setSignPassword(password: string) {
    return http.post('/auth/sign-password', { password })
  },
  changeSignPassword(oldPassword: string, newPassword: string) {
    return http.put('/auth/sign-password', { oldPassword, newPassword })
  },
  verifySignPassword(password: string, sessionId?: string) {
    const config: any = {}
    if (sessionId) {
      config.headers = { 'X-Request-ID': sessionId }
    }
    return http.post('/auth/sign-password/verify', { password }, config)
  },
  uploadSignatureImage(data: FormData) {
    return http.post('/auth/signature-image', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getSignatureImage() {
    return http.get('/auth/signature-image', { responseType: 'blob' })
  },
  getSignatureImagePreview(password: string) {
    return http.post('/auth/signature-image/preview', { password }, { responseType: 'blob' })
  },
  deleteSignatureImage(password: string) {
    return http.delete('/auth/signature-image', { data: { password } })
  },
  uploadCertificate(data: FormData) {
    return http.post('/auth/certificate', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getCertificateInfo() {
    return http.get('/auth/certificate')
  },
  deleteCertificate(password: string) {
    return http.delete('/auth/certificate', { data: { password } })
  },
}

export const tenantAPI = {
  list(params?: { keyword?: string; status?: string; page?: number; pageSize?: number }) {
    return http.get('/admin/tenants', { params })
  },
  create(data: { name: string; slug: string; contactName?: string; contact?: string; address?: string; description?: string }) {
    return http.post('/admin/tenants', data)
  },
  update(id: string, data: { name?: string; slug?: string; contactName?: string; contact?: string; address?: string; description?: string }) {
    return http.put(`/admin/tenants/${id}`, data)
  },
  setStatus(id: string, enabled: boolean) {
    return http.patch(`/admin/tenants/${id}/status`, { enabled })
  },
  remove(id: string) {
    return http.delete(`/admin/tenants/${id}`)
  },
  listAdmins(id: string) {
    return http.get(`/admin/tenants/${id}/admins`)
  },
  createAdmin(id: string, data: { name: string; email: string; password: string }) {
    return http.post(`/admin/tenants/${id}/admins`, data)
  },
  resetAdminPassword(id: string, userId: string, newPassword: string) {
    return http.put(`/admin/tenants/${id}/admins/${userId}/reset-password`, { newPassword })
  },
  setAdminStatus(id: string, userId: string, status: 'active' | 'disabled') {
    return http.patch(`/admin/tenants/${id}/admins/${userId}/status`, { status })
  },
  removeAdmin(id: string, userId: string) {
    return http.delete(`/admin/tenants/${id}/admins/${userId}`)
  },
}

export const departmentAPI = {
  list() {
    return http.get('/departments')
  },
  create(data: { name: string; parentId?: string }) {
    return http.post('/departments', data)
  },
  update(id: string, data: { name: string }) {
    return http.put(`/departments/${id}`, data)
  },
  remove(id: string) {
    return http.delete(`/departments/${id}`)
  },
}

export const directoryAPI = {
  tree() {
    return http.get('/directory/tree')
  },
  users(params?: { deptId?: string; keyword?: string; page?: number; pageSize?: number }) {
    return http.get('/directory/users', { params })
  },
}

export const roleAPI = {
  list() {
    return http.get('/roles')
  },
  create(data: { name: string; code: string; description?: string; dataScope?: string }) {
    return http.post('/roles', data)
  },
  update(id: string, data: { name?: string; description?: string }) {
    return http.put(`/roles/${id}`, data)
  },
  remove(id: string) {
    return http.delete(`/roles/${id}`)
  },
  getPermissions(id: string) {
    return http.get(`/roles/${id}/permissions`)
  },
  setPermissions(id: string, permissions: string[]) {
    return http.put(`/roles/${id}/permissions`, { permissions })
  },
}

export const userAPI = {
  getMe() {
    return http.get('/users/me')
  },
  updateMe(data: { name?: string; email?: string }) {
    return http.put('/users/me', data)
  },
  changePassword(data: { oldPassword: string; newPassword: string }) {
    return http.put('/users/me/password', data)
  },
  list(params?: { keyword?: string; page?: number; pageSize?: number }) {
    return http.get('/users', { params })
  },
  create(data: { name: string; email: string; password: string; departmentId?: string; role: string }) {
    return http.post('/users', data)
  },
  update(id: string, data: { name?: string; email?: string; departmentId?: string }) {
    return http.put(`/users/${id}`, data)
  },
  changeStatus(id: string, status: 'active' | 'disabled') {
    return http.patch(`/users/${id}/status`, { status })
  },
  updateRole(id: string, role: string) {
    return http.put(`/users/${id}/role`, { role })
  },
}

export const templateAPI = {
  list(params?: { keyword?: string; status?: string; page?: number; pageSize?: number }) {
    return http.get('/templates', { params })
  },
  getDetail(id: string) {
    return http.get(`/templates/${id}`)
  },
  update(id: string, data: any) {
    return http.patch(`/templates/${id}`, data)
  },
  delete(id: string) {
    return http.delete(`/templates/${id}`)
  },
  publish(id: string, initiateScope?: { type: string; id: string }[]) {
    return http.patch(`/templates/${id}/publish`, initiateScope ? { initiateScope } : undefined)
  },
  unpublish(id: string) {
    return http.patch(`/templates/${id}/unpublish`)
  },
  getPDFUrl(id: string) {
    return `/api/v1/templates/${id}/pdf`
  },
  uploadPDF(data: FormData) {
    return http.post('/templates/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  analyzePDF(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return http.post('/templates/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const documentAPI = {
  list(params?: {
    keyword?: string
    status?: string
    initiatorId?: string
    timeField?: 'createdAt' | 'updatedAt'
    startTime?: string
    endTime?: string
    page?: number
    pageSize?: number
  }) {
    return http.get('/documents', { params })
  },
  initiate(data: { templateId: string; title: string }) {
    return http.post('/documents', data)
  },
  getDetail(id: string) {
    return http.get(`/documents/${id}`)
  },
  submitStep(docId: string, step: number, data: { fieldValues: Record<string, any>; shouldSign: boolean; signPassword?: string; handwrittenSignature?: string; saveSignature?: boolean; nextAssigneeId?: string }) {
    return http.post(`/documents/${docId}/steps/${step}`, data)
  },
  sign(docId: string, step: number, sessionId?: string, fieldValues?: Record<string, any>) {
    const config: any = { responseType: 'blob' }
    if (sessionId) {
      config.headers = { 'X-Request-ID': sessionId }
    }
    return http.post(`/documents/${docId}/sign/${step}`, { fieldValues: fieldValues || {} }, config)
  },
  returnStep(docId: string) {
    return http.post(`/documents/${docId}/return`)
  },
  rejectDocument(docId: string) {
    return http.post(`/documents/${docId}/reject`)
  },
  withdrawDocument(docId: string) {
    return http.post(`/documents/${docId}/withdraw`)
  },
  getPDFUrl(id: string) {
    return `/api/v1/documents/${id}/pdf`
  },
  downloadPDF(id: string) {
    return http.get(`/documents/${id}/pdf`, { responseType: 'blob' })
  },
  fieldHistory(docId: string, fieldKey: string) {
    return http.get(`/documents/${docId}/field-history`, { params: { fieldKey } })
  },
}

export const handoffAPI = {
  generate(data: { documentId: string; stepOrder: number }) {
    return http.post('/handoff/tokens', data)
  },
  bind(token: string) {
    return http.post('/handoff/tokens/bind', { token })
  },
  revoke(data: { documentId: string; stepOrder: number }) {
    return http.post('/handoff/tokens/revoke', data)
  },
}

export const notificationAPI = {
  list(params?: { isRead?: boolean; page?: number; pageSize?: number }) {
    return http.get('/notifications', { params })
  },
  unreadCount() {
    return http.get('/notifications/unread-count')
  },
  markRead(id: string) {
    return http.put(`/notifications/${id}/read`)
  },
  markAllRead() {
    return http.put('/notifications/read-all')
  },
}

export const auditLogAPI = {
  list(params?: { action?: string; userId?: string; keyword?: string; page?: number; pageSize?: number }) {
    return http.get('/audit-logs', { params })
  },
  verifyChain() {
    return http.get('/audit-logs/verify-chain')
  },
  export(params?: { action?: string; userId?: string; keyword?: string }) {
    return http.get('/audit-logs/export', { params, responseType: 'blob' }).then(res => {
      const blob = res.data as Blob
      const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
      saveBlobFile(blob, `audit-logs-${ts}.csv`)
    })
  },
}

export const caAPI = {
  init() {
    return http.post('/admin/ca/init', {})
  },
  getInfo() {
    return http.get('/admin/ca')
  },
  revokeCert(certId: string) {
    return http.post('/admin/ca/revoke', { certId })
  },
  listCertificates() {
    return http.get('/admin/ca/certificates')
  },
  async downloadCACert() {
    const blob = await http.get('/admin/ca/cert', { responseType: 'blob' })
    saveBlobFile(blob as unknown as Blob, 'ca-root.cer')
  },
  async downloadCRL() {
    const blob = await http.get('/admin/ca/crl', { responseType: 'blob' })
    saveBlobFile(blob as unknown as Blob, 'ca.crl')
  },
  getMyCACert() {
    return http.get('/auth/ca-certificate')
  },
  async downloadMyCACert() {
    const blob = await http.get('/auth/ca-certificate/download', { responseType: 'blob' })
    saveBlobFile(blob as unknown as Blob, 'my-certificate.pem')
  },
  apply(data: { password: string; reason?: string }) {
    return http.post('/auth/ca/apply', data)
  },
  getMyApplications() {
    return http.get('/auth/ca/applications')
  },
  listApplications(status?: string) {
    return http.get('/admin/ca/applications', { params: { status } })
  },
  approveApplication(id: string) {
    return http.post(`/admin/ca/applications/${id}/approve`)
  },
  rejectApplication(id: string, reason: string) {
    return http.post(`/admin/ca/applications/${id}/reject`, { reason })
  },
}