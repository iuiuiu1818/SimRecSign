<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { userAPI, departmentAPI, roleAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const userStore = useUserStore()
const isSuperAdmin = userStore.roles.includes('super_admin')

const users = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const loading = ref(false)

async function loadList() {
  loading.value = true
  try {
    const res: any = await userAPI.list({ keyword: keyword.value, page: page.value, pageSize: pageSize.value })
    users.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {   }
  finally { loading.value = false }
}
onMounted(loadList)

function handleSearch() { page.value = 1; loadList() }

const roles = ref<any[]>([])
const roleLabelMap = ref<Record<string, string>>({
  super_admin: '超级管理员',
  org_admin: '组织管理员',
  template_editor: '模板设计者',
  user: '普通用户',
})
const roleTypeMap: Record<string, string> = {
  super_admin: 'danger',
  org_admin: 'warning',
  template_editor: 'primary',
  user: 'info',
}

async function loadRoles() {
  try {
    const res: any = await roleAPI.list()
    roles.value = res.data || []
    const labels: Record<string, string> = { ...roleLabelMap.value }
    for (const r of roles.value) {
      if (!labels[r.code]) {
        labels[r.code] = r.name
      }
    }
    roleLabelMap.value = labels
  } catch {   }
}

const createDialogVisible = ref(false)
const createForm = ref({ name: '', email: '', password: '', departmentId: '', role: 'user' })
const saving = ref(false)

const departments = ref<any[]>([])
async function loadDepartments() {
  try {
    const res: any = await departmentAPI.list()
    departments.value = res.data || []
  } catch {
    departments.value = []
  }
}
onMounted(() => {
  loadList()
  loadDepartments()
  loadRoles()
})

function openCreate() {
  createForm.value = { name: '', email: '', password: '', departmentId: '', role: 'user' }
  createDialogVisible.value = true
}

async function handleCreate() {
  if (!createForm.value.name || !createForm.value.email || !createForm.value.password) {
    ElMessage.warning('请填写完整信息')
    return
  }
  if (!createForm.value.email.includes('@')) {
    ElMessage.warning('邮箱格式不正确')
    return
  }
  saving.value = true
  try {
    await userAPI.create(createForm.value)
    ElMessage.success('创建成功')
    createDialogVisible.value = false
    loadList()
  } catch {   }
  finally { saving.value = false }
}

const editDialogVisible = ref(false)
const editForm = ref({ id: '', name: '', email: '', departmentId: '' })

function openEdit(row: any) {
  editForm.value = { id: row.id, name: row.name, email: row.email, departmentId: row.departmentId || '' }
  editDialogVisible.value = true
}

async function handleEdit() {
  if (!editForm.value.name || !editForm.value.email) {
    ElMessage.warning('请填写完整信息')
    return
  }
  saving.value = true
  try {
    await userAPI.update(editForm.value.id, {
      name: editForm.value.name,
      email: editForm.value.email,
      departmentId: editForm.value.departmentId || undefined,
    })
    ElMessage.success('修改成功')
    editDialogVisible.value = false
    loadList()
  } catch {   }
  finally { saving.value = false }
}

const roleDialogVisible = ref(false)
const roleForm = ref({ id: '', role: 'user' })

function openRole(row: any) {
  roleForm.value = { id: row.id, role: row.roles?.[0] || 'user' }
  roleDialogVisible.value = true
}

async function handleRole() {
  saving.value = true
  try {
    await userAPI.updateRole(roleForm.value.id, roleForm.value.role)
    ElMessage.success('角色修改成功')
    roleDialogVisible.value = false
    loadList()
  } catch {   }
  finally { saving.value = false }
}

async function handleToggleStatus(row: any) {
  const newStatus = row.status === 'active' ? 'disabled' : 'active'
  const label = newStatus === 'disabled' ? '停用' : '启用'
  try {
    await ElMessageBox.confirm(`确定${label}用户「${row.name}」吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    await userAPI.changeStatus(row.id, newStatus)
    ElMessage.success(`${label}成功`)
    loadList()
  } catch {
  }
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>用户管理</span>
        <el-button type="primary" size="small" @click="openCreate">新增用户</el-button>
      </div>
    </template>

    <div class="toolbar">
      <el-form :inline="true" @keyup.enter="handleSearch">
        <el-form-item>
          <el-input v-model="keyword" placeholder="搜索姓名/邮箱" clearable style="width: 240px" @clear="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="users" stripe v-loading="loading" empty-text="暂无用户">
      <el-table-column prop="name" label="姓名" width="140" />
      <el-table-column prop="email" label="邮箱" min-width="200" />
      <el-table-column label="部门" width="140">
        <template #default="{ row }">{{ row.departmentName || '—' }}</template>
      </el-table-column>
      <el-table-column label="角色" width="140">
        <template #default="{ row }">
          <el-tag
            v-for="r in (row.roles || [])"
            :key="r"
            :type="(roleTypeMap[r] as any) || 'info'"
            size="small"
            effect="plain"
            style="margin-right: 4px;"
          >
            {{ roleLabelMap[r] || r }}
          </el-tag>
          <span v-if="!row.roles?.length">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small" effect="plain">
            {{ row.status === 'active' ? '正常' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" size="small" @click="openRole(row)">角色</el-button>
          <el-button
            link
            :type="row.status === 'active' ? 'warning' : 'success'"
            size="small"
            @click="handleToggleStatus(row)"
          >
            {{ row.status === 'active' ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper" v-if="total > 0">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        background
        @current-change="loadList"
      />
    </div>

    <el-dialog v-model="createDialogVisible" title="新增用户" width="480px">
      <el-form :model="createForm" label-position="top">
        <el-form-item label="姓名" required>
          <el-input v-model="createForm.name" placeholder="请输入姓名" maxlength="50" />
        </el-form-item>
        <el-form-item label="邮箱" required>
          <el-input v-model="createForm.email" placeholder="name@company.com" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="createForm.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="createForm.departmentId" placeholder="选择部门" clearable style="width: 100%">
            <el-option
              v-for="d in departments"
              :key="d.id"
              :label="d.name"
              :value="d.id"
            />
            <el-option v-if="departments.length === 0" :value="''" label="暂无部门数据" disabled />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="createForm.role" placeholder="选择角色" style="width: 100%">
            <el-option
              v-for="r in roles"
              :key="r.code"
              :label="r.name"
              :value="r.code"
              :disabled="r.code === 'super_admin' && !isSuperAdmin"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="编辑用户" width="480px">
      <el-form :model="editForm" label-position="top">
        <el-form-item label="姓名" required>
          <el-input v-model="editForm.name" placeholder="请输入姓名" maxlength="50" />
        </el-form-item>
        <el-form-item label="邮箱" required>
          <el-input v-model="editForm.email" placeholder="name@company.com" />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="editForm.departmentId" placeholder="选择部门" clearable style="width: 100%">
            <el-option
              v-for="d in departments"
              :key="d.id"
              :label="d.name"
              :value="d.id"
            />
            <el-option v-if="departments.length === 0" :value="''" label="暂无部门数据" disabled />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleEdit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="roleDialogVisible" title="修改角色" width="360px">
      <el-form :model="roleForm" label-position="top">
        <el-form-item label="角色" required>
          <el-select v-model="roleForm.role" placeholder="选择角色" style="width: 100%">
            <el-option
              v-for="r in roles"
              :key="r.code"
              :label="r.name"
              :value="r.code"
              :disabled="r.code === 'super_admin' && !isSuperAdmin"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleRole">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.toolbar { margin-bottom: 16px; }
.pagination-wrapper { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>