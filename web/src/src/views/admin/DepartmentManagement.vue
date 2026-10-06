<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { departmentAPI } from '@/api'
import { usePermissionStore } from '@/stores/permission'
import { ElMessage, ElMessageBox } from 'element-plus'

interface DepartmentNode {
  id: string
  name: string
  parentId: string
  children?: DepartmentNode[]
  [key: string]: any
}

const permStore = usePermissionStore()
const departments = ref<DepartmentNode[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const form = ref({ name: '', parentId: '' })
const saving = ref(false)

async function loadDepartments() {
  loading.value = true
  try {
    const res: any = await departmentAPI.list()
    departments.value = res.data || []
  } catch {   }
  finally { loading.value = false }
}

function handleAdd(parent?: DepartmentNode) {
  dialogTitle.value = parent ? `添加子部门 — ${parent.name}` : '添加部门'
  form.value = { name: '', parentId: parent?.id || '' }
  dialogVisible.value = true
}

function handleEdit(row: DepartmentNode) {
  dialogTitle.value = '重命名部门'
  form.value = { name: row.name, parentId: '' }
  editingId.value = row.id
  dialogVisible.value = true
}

const editingId = ref('')

async function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入部门名称')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await departmentAPI.update(editingId.value, { name: form.value.name.trim() })
      ElMessage.success('修改成功')
    } else {
      await departmentAPI.create({ name: form.value.name.trim(), parentId: form.value.parentId || undefined })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    editingId.value = ''
    loadDepartments()
  } catch {   }
  finally { saving.value = false }
}

async function handleDelete(row: DepartmentNode) {
  try {
    await ElMessageBox.confirm(
      `确定删除部门「${row.name}」吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await departmentAPI.remove(row.id)
    ElMessage.success('删除成功')
    loadDepartments()
  } catch {   }
}

onMounted(loadDepartments)
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>部门管理</span>
        <el-button type="primary" size="small" v-permission="'department:create'" @click="handleAdd()">添加根部门</el-button>
      </div>
    </template>

    <el-table
      :data="departments"
      v-loading="loading"
      row-key="id"
      default-expand-all
      stripe
      border
    >
      <el-table-column prop="name" label="部门名称" min-width="200" />
      <el-table-column label="操作" width="220" align="center">
        <template #default="{ row }">
          <el-button v-if="permStore.hasPermission('department:create')" type="primary" link size="small" @click="handleAdd(row)">添加子部门</el-button>
          <el-button v-if="permStore.hasPermission('department:update')" type="primary" link size="small" @click="handleEdit(row)">重命名</el-button>
          <el-button v-if="permStore.hasPermission('department:delete')" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && departments.length === 0" description="暂无部门数据" />
    <div v-if="!loading && departments.length === 0" style="text-align:center;margin-top:8px">
      <el-button type="primary" size="small" v-permission="'department:create'" @click="handleAdd()">创建第一个部门</el-button>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="400px" @closed="editingId = ''">
      <el-form :model="form" label-width="80px">
        <el-form-item label="部门名称">
          <el-input v-model="form.name" placeholder="请输入部门名称" maxlength="50" @keyup.enter="handleSave" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>