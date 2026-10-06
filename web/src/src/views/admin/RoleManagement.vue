<script setup lang="ts">
import { ref, onMounted } from 'vue'
import http from '@/api'
import { roleAPI } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Role {
  id: string
  name: string
  code: string
  description: string
  isSystem: boolean
  isEnabled: boolean
  dataScope: string
}

interface Permission {
  code: string
  name: string
  module: string
  description: string
  isEnabled: boolean
}

const roles = ref<Role[]>([])
const loading = ref(false)

const permissionsByModule = ref<Record<string, { code: string; name: string; description: string }[]>>({})
const permLoading = ref(false)

const dialogVisible = ref(false)
const dialogTitle = ref('')
const form = ref({ name: '', code: '', description: '', dataScope: 'self' })
const saving = ref(false)

const dataScopeOptions = [
  { value: 'self', label: '仅本人数据' },
  { value: 'tenant', label: '全租户数据' },
]

const permDialogVisible = ref(false)
const currentRole = ref<Role | null>(null)
const selectedPerms = ref<string[]>([])
const permSaving = ref(false)

async function loadRoles() {
  loading.value = true
  try {
    const res: any = await roleAPI.list()
    roles.value = res.data || []
  } catch {   }
  finally { loading.value = false }
}

async function loadPermissions() {
  permLoading.value = true
  try {
    const res: any = await http.get('/permissions/flat')
    const perms: Permission[] = res.data || []
    const grouped: Record<string, { code: string; name: string; description: string }[]> = {}
    for (const p of perms) {
      if (!grouped[p.module]) grouped[p.module] = []
      grouped[p.module].push({ code: p.code, name: p.name, description: p.description || '' })
    }
    permissionsByModule.value = grouped
  } catch {   }
  finally { permLoading.value = false }
}

const moduleNames: Record<string, string> = {
  tenant: '租户管理',
  user: '用户管理',
  role: '角色管理',
  department: '部门管理',
  template: '模板管理',
  document: '文档管理',
  audit: '审计日志',
  certificate: '证书管理',
  signature: '签名图管理',
  handoff: '交接链接',
  notification: '通知中心',
  directory: '通讯录',
}

function openCreate() {
  dialogTitle.value = '创建角色'
  form.value = { name: '', code: '', description: '', dataScope: 'self' }
  dialogVisible.value = true
}

async function handleCreate() {
  if (!form.value.name.trim() || !form.value.code.trim()) {
    ElMessage.warning('请填写角色名称和编码')
    return
  }
  saving.value = true
  try {
    await roleAPI.create({
      name: form.value.name.trim(),
      code: form.value.code.trim(),
      description: form.value.description.trim() || undefined,
      dataScope: form.value.dataScope || 'self',
    })
    ElMessage.success('创建成功')
    dialogVisible.value = false
    loadRoles()
  } catch {   }
  finally { saving.value = false }
}

async function handleDelete(row: Role) {
  if (row.isSystem) {
    ElMessage.warning('系统角色不可删除')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定删除角色「${row.name}」吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch { return }
  try {
    await roleAPI.remove(row.id)
    ElMessage.success('删除成功')
    loadRoles()
  } catch {   }
}

async function openAssignPerms(row: Role) {
  if (row.isSystem) {
    ElMessage.warning('系统角色的权限不可修改')
    return
  }
  currentRole.value = row
  selectedPerms.value = []
  permDialogVisible.value = true

  try {
    const res: any = await roleAPI.getPermissions(row.id)
    selectedPerms.value = res.data?.permissions || []
  } catch {   }
}

async function handleAssignPerms() {
  if (!currentRole.value) return
  permSaving.value = true
  try {
    await roleAPI.setPermissions(currentRole.value.id, selectedPerms.value)
    ElMessage.success('权限分配成功')
    permDialogVisible.value = false
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.msg || e?.message || '权限分配失败')
  }
  finally { permSaving.value = false }
}

function toggleAllPerms(module: string, checked: boolean) {
  const modulePerms = permissionsByModule.value[module] || []
  const codes = modulePerms.map(p => p.code)
  if (checked) {
    for (const code of codes) {
      if (!selectedPerms.value.includes(code)) {
        selectedPerms.value.push(code)
      }
    }
  } else {
    selectedPerms.value = selectedPerms.value.filter(c => !codes.includes(c))
  }
}

function isModuleAllSelected(module: string): boolean {
  const codes = (permissionsByModule.value[module] || []).map(p => p.code)
  return codes.length > 0 && codes.every(c => selectedPerms.value.includes(c))
}

function isModuleIndeterminate(module: string): boolean {
  const codes = (permissionsByModule.value[module] || []).map(p => p.code)
  const selected = codes.filter(c => selectedPerms.value.includes(c))
  return selected.length > 0 && selected.length < codes.length
}

onMounted(() => {
  loadRoles()
  loadPermissions()
})
</script>

<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>角色管理</span>
          <el-button type="primary" size="small" @click="openCreate" v-permission="'role:create'">创建角色</el-button>
        </div>
      </template>

      <el-table :data="roles" stripe v-loading="loading" empty-text="暂无角色">
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="code" label="编码" width="140" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '—' }}</template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isSystem" type="warning" size="small" effect="plain">系统内置</el-tag>
            <el-tag v-else type="info" size="small" effect="plain">自定义</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'danger'" size="small" effect="plain">
              {{ row.isEnabled ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'role:read'" link type="primary" size="small" @click="openAssignPerms(row)">权限</el-button>
            <el-button v-if="!row.isSystem && row.code !== 'super_admin'" v-permission="'role:delete'" link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px">
      <el-form :model="form" label-position="top">
        <el-form-item label="角色名称" required>
          <el-input v-model="form.name" placeholder="如：财务审核员" maxlength="50" />
        </el-form-item>
        <el-form-item label="角色编码" required>
          <el-input v-model="form.code" placeholder="如：finance_auditor（字母数字下划线）" maxlength="50" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="角色描述（可选）" maxlength="200" />
        </el-form-item>
        <el-form-item label="数据权限">
          <el-radio-group v-model="form.dataScope">
            <el-radio v-for="opt in dataScopeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </el-radio>
          </el-radio-group>
          <div class="form-tip">「全租户数据」可查看租户下所有文档和模板，「仅本人数据」仅可见自己创建或参与的</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="permDialogVisible" :title="`权限分配 — ${currentRole?.name || ''}`" width="700px" :close-on-click-modal="false">
      <div v-loading="permLoading" class="perm-tree">
        <el-checkbox
          :indeterminate="isModuleAllSelected('') === false"
          :checked="false"
          style="display:none"
        />
        <div v-for="(perms, module) in permissionsByModule" :key="module" class="perm-module">
          <div class="perm-module-header">
            <el-checkbox
              :model-value="isModuleAllSelected(module)"
              :indeterminate="isModuleIndeterminate(module)"
              @change="(val: boolean) => toggleAllPerms(module, val)"
            >
              <strong>{{ moduleNames[module] || module }}</strong>
            </el-checkbox>
          </div>
          <div class="perm-items">
            <el-checkbox
              v-for="p in perms"
              :key="p.code"
              :label="p.code"
              v-model="selectedPerms"
              style="margin-right: 16px; margin-bottom: 8px;"
            >
              {{ p.name }}
              <span class="perm-code">{{ p.code }}</span>
            </el-checkbox>
          </div>
        </div>
        <el-empty v-if="Object.keys(permissionsByModule).length === 0 && !permLoading" description="暂无权限点数据" />
      </div>
      <template #footer>
        <el-button @click="permDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="permSaving" @click="handleAssignPerms">保存权限</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.perm-tree { max-height: 500px; overflow-y: auto; }
.perm-module { margin-bottom: 16px; padding: 12px; background: var(--srs-bg-card); border-radius: 6px; border: 1px solid var(--srs-border); }
.perm-module-header { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--srs-border); }
.perm-items { display: flex; flex-wrap: wrap; }
.perm-code { color: var(--srs-text-tertiary); font-size: 11px; margin-left: 4px; }
</style>