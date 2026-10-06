import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import { showToast } from 'vant'

const http: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let toastTimer: ReturnType<typeof setTimeout> | null = null
http.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.config.responseType === 'blob' || response.config.responseType === 'arraybuffer') {
      return response.data
    }
    const data = response.data
    if (data.code !== 0) {
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        showToast(data.msg || '请求失败')
        toastTimer = null
      }, 100)
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
        window.location.href = import.meta.env.BASE_URL + 'login'
      }
    }

    if (!isAuthEndpoint) {
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        showToast(error.response?.data?.msg || '网络错误')
        toastTimer = null
      }, 100)
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
  caApply(data: { password: string; reason?: string }) {
    return http.post('/auth/ca/apply', data)
  },
  getMyApplications() {
    return http.get('/auth/ca/applications')
  },
  getMyCACert() {
    return http.get('/auth/ca-certificate')
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
  list(params?: { keyword?: string; status?: string; page?: number; pageSize?: number }) {
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

export const directoryAPI = {
  tree() {
    return http.get('/directory/tree')
  },
  users(params?: { deptId?: string; keyword?: string; page?: number; pageSize?: number }) {
    return http.get('/directory/users', { params })
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