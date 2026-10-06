<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { tenantAPI } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const tenants = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const keyword = ref('')
const status = ref('')

const dialogVisible = ref(false)
const dialogTitle = ref('创建租户')
const editingId = ref('')
const form = ref<any>({ name: '', slug: '', contactName: '', contact: '', address: '', description: '' })
const saving = ref(false)

async function loadList() {
  loading.value = true
  try {
    const res: any = await tenantAPI.list({
      keyword: keyword.value || undefined,
      status: status.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    tenants.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {   }
  finally { loading.value = false }
}
onMounted(loadList)

function handleSearch() {
  page.value = 1
  loadList()
}
function handleReset() {
  keyword.value = ''
  status.value = ''
  page.value = 1
  loadList()
}

function openCreate() {
  editingId.value = ''
  dialogTitle.value = '创建租户'
  form.value = { name: '', slug: '', contactName: '', contact: '', address: '', description: '' }
  dialogVisible.value = true
}

function openEdit(row: any) {
  editingId.value = row.id
  dialogTitle.value = '编辑租户'
  form.value = {
    name: row.name,
    slug: row.slug,
    contactName: row.contactName || '',
    contact: row.contact || '',
    address: row.address || '',
    description: row.description || '',
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.slug) { ElMessage.warning('请填写名称和标识'); return }
  saving.value = true
  try {
    if (editingId.value) {
      await tenantAPI.update(editingId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await tenantAPI.create(form.value)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadList()
  } catch {   }
  finally { saving.value = false }
}

async function toggleStatus(row: any) {
  const next = !row.enabled
  const action = next ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确定要${action}租户「${row.name}」吗？`, '提示', {
      type: 'warning',
      confirmButtonText: action,
    })
  } catch {
    return
  }
  try {
    await tenantAPI.setStatus(row.id, next)
    ElMessage.success(`${action}成功`)
    loadList()
  } catch {   }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(
      `确定要删除租户「${row.name}」吗？该操作将级联删除该租户下的所有用户、模板、文档等数据，且不可恢复！`,
      '危险操作',
      { type: 'error', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger' }
    )
  } catch {
    return
  }
  try {
    await tenantAPI.remove(row.id)
    ElMessage.success('删除成功')
    loadList()
  } catch {   }
}

function handlePageChange(p: number) {
  page.value = p
  loadList()
}
function handleSizeChange(s: number) {
  pageSize.value = s
  page.value = 1
  loadList()
}

const adminsVisible = ref(false)
const adminsTenant = ref<any>(null)
const admins = ref<any[]>([])
const adminsLoading = ref(false)

const adminCreateVisible = ref(false)
const adminForm = ref({ name: '', email: '', password: '' })
const adminSaving = ref(false)

const pwdVisible = ref(false)
const pwdTarget = ref<any>(null)
const pwdNew = ref('')
const pwdSaving = ref(false)

async function openAdmins(row: any) {
  adminsTenant.value = row
  adminsVisible.value = true
  await loadAdmins()
}

async function loadAdmins() {
  if (!adminsTenant.value) return
  adminsLoading.value = true
  try {
    const res: any = await tenantAPI.listAdmins(adminsTenant.value.id)
    admins.value = res.data?.list || []
  } catch {   }
  finally { adminsLoading.value = false }
}

function openAdminCreate() {
  adminForm.value = { name: '', email: '', password: '' }
  adminCreateVisible.value = true
}

async function handleAdminCreate() {
  if (!adminForm.value.name || !adminForm.value.email || !adminForm.value.password) {
    ElMessage.warning('请填写完整信息')
    return
  }
  if (!adminForm.value.email.includes('@')) {
    ElMessage.warning('邮箱格式不正确')
    return
  }
  adminSaving.value = true
  try {
    await tenantAPI.createAdmin(adminsTenant.value.id, adminForm.value)
    ElMessage.success('创建成功')
    adminCreateVisible.value = false
    loadAdmins()
  } catch {   }
  finally { adminSaving.value = false }
}

function openResetPwd(row: any) {
  pwdTarget.value = row
  pwdNew.value = ''
  pwdVisible.value = true
}

async function handleResetPwd() {
  if (!pwdNew.value) { ElMessage.warning('请输入新密码'); return }
  pwdSaving.value = true
  try {
    await tenantAPI.resetAdminPassword(adminsTenant.value.id, pwdTarget.value.id, pwdNew.value)
    ElMessage.success('密码重置成功')
    pwdVisible.value = false
  } catch {   }
  finally { pwdSaving.value = false }
}

async function handleToggleAdminStatus(row: any) {
  const next = row.status === 'active' ? 'disabled' : 'active'
  const action = next === 'disabled' ? '停用' : '启用'
  try {
    await ElMessageBox.confirm(`确定${action}管理员「${row.name}」吗？`, '提示', {
      type: 'warning',
      confirmButtonText: action,
    })
  } catch {
    return
  }
  try {
    await tenantAPI.setAdminStatus(adminsTenant.value.id, row.id, next)
    ElMessage.success(`${action}成功`)
    loadAdmins()
  } catch {   }
}

async function handleDeleteAdmin(row: any) {
  try {
    await ElMessageBox.confirm(
      `确定要删除管理员「${row.name}」吗？该操作不可恢复！`,
      '删除确认',
      { type: 'error', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger' }
    )
  } catch {
    return
  }
  try {
    await tenantAPI.removeAdmin(adminsTenant.value.id, row.id)
    ElMessage.success('删除成功')
    loadAdmins()
  } catch {   }
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>租户管理</span>
        <el-button @click="openCreate" type="primary" size="small">创建租户</el-button>
      </div>
    </template>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索名称/标识/联系人/联系方式"
        clearable
        style="width: 260px"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select v-model="status" placeholder="全部状态" clearable style="width: 140px" @change="handleSearch">
        <el-option label="启用" value="enabled" />
        <el-option label="停用" value="disabled" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <el-table :data="tenants" stripe v-loading="loading" empty-text="暂无租户">
      <el-table-column prop="name" label="租户名称" min-width="160" />
      <el-table-column prop="slug" label="标识" width="130" />
      <el-table-column prop="contactName" label="联系人" width="110">
        <template #default="{ row }">{{ row.contactName || '-' }}</template>
      </el-table-column>
      <el-table-column prop="contact" label="联系方式" width="150">
        <template #default="{ row }">{{ row.contact || '-' }}</template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ row.description || '-' }}</template>
      </el-table-column>
      <el-table-column prop="enabled" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'danger'" size="small" effect="plain">
            {{ row.enabled ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" size="small" @click="openAdmins(row)">管理者</el-button>
          <el-button link :type="row.enabled ? 'warning' : 'success'" size="small" @click="toggleStatus(row)">
            {{ row.enabled ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
      <el-form label-position="top">
        <el-form-item label="租户名称" required>
          <el-input v-model="form.name" placeholder="如：XX科技有限公司" />
        </el-form-item>
        <el-form-item label="标识" required>
          <el-input v-model="form.slug" placeholder="如：xx-tech（字母数字组合）" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contactName" placeholder="如：张三" />
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input v-model="form.contact" placeholder="如：13800000000 或 contact@example.com" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="如：北京市朝阳区XX路XX号" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="租户简介（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="adminsVisible" :title="`管理者 - ${adminsTenant?.name || ''}`" width="780px" @closed="admins = []">
      <div class="admins-header">
        <span>该租户下的组织管理员：</span>
        <el-button type="primary" size="small" @click="openAdminCreate">新增管理者</el-button>
      </div>
      <el-table :data="admins" stripe v-loading="adminsLoading" empty-text="暂无组织管理员" style="margin-top: 12px">
        <el-table-column prop="name" label="姓名" width="140" />
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small" effect="plain">
              {{ row.status === 'active' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openResetPwd(row)">重置密码</el-button>
            <el-button link :type="row.status === 'active' ? 'warning' : 'success'" size="small" @click="handleToggleAdminStatus(row)">
              {{ row.status === 'active' ? '停用' : '启用' }}
            </el-button>
            <el-button link type="danger" size="small" @click="handleDeleteAdmin(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="adminCreateVisible" title="新增组织管理员" width="480px">
      <el-form label-position="top">
        <el-form-item label="姓名" required>
          <el-input v-model="adminForm.name" placeholder="如：张三" />
        </el-form-item>
        <el-form-item label="邮箱" required>
          <el-input v-model="adminForm.email" placeholder="admin@company.com" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="adminForm.password" type="password" show-password placeholder="初始登录密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adminCreateVisible = false">取消</el-button>
        <el-button type="primary" :loading="adminSaving" @click="handleAdminCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="pwdVisible" title="重置密码" width="400px">
      <p style="margin-bottom: 16px; color: var(--srs-text-secondary)">
        重置管理员「{{ pwdTarget?.name || '' }}」的登录密码
      </p>
      <el-form label-position="top">
        <el-form-item label="新密码" required>
          <el-input v-model="pwdNew" type="password" show-password placeholder="输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdSaving" @click="handleResetPwd">确认重置</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>