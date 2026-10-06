<script setup lang="ts">
import { ref, onMounted } from 'vue'
import http from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Category {
  id: string
  name: string
  sort: number
}

const categories = ref<Category[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const editingId = ref('')
const form = ref({ name: '', sort: 0 })
const saving = ref(false)

async function loadCategories() {
  loading.value = true
  try {
    const res: any = await http.get('/categories')
    categories.value = res.data || []
  } catch {   }
  finally { loading.value = false }
}

function handleAdd() {
  dialogTitle.value = '添加分类'
  editingId.value = ''
  form.value = { name: '', sort: categories.value.length + 1 }
  dialogVisible.value = true
}

function handleEdit(row: Category) {
  dialogTitle.value = '编辑分类'
  editingId.value = row.id
  form.value = { name: row.name, sort: row.sort }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await http.put(`/categories/${editingId.value}`, form.value)
      ElMessage.success('分类已更新')
    } else {
      await http.post('/categories', form.value)
      ElMessage.success('分类已添加')
    }
    dialogVisible.value = false
    loadCategories()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
  finally { saving.value = false }
}

async function handleDelete(row: Category) {
  try {
    await ElMessageBox.confirm(`确认删除分类「${row.name}」？`, '删除确认', {
      type: 'warning',
    })
  } catch { return }
  try {
    await http.delete(`/categories/${row.id}`)
    categories.value = categories.value.filter(c => c.id !== row.id)
    ElMessage.success('已删除')
  } catch (e: any) {
    ElMessage.error(e.message || '删除失败')
  }
}

onMounted(loadCategories)
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>模板分类管理</span>
        <el-button v-permission="'template:create'" type="primary" size="small" @click="handleAdd">添加分类</el-button>
      </div>
    </template>

    <el-table :data="categories" v-loading="loading" stripe>
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column prop="name" label="分类名称" min-width="200" />
      <el-table-column label="操作" width="160" align="center">
        <template #default="{ row }">
          <el-button v-permission="'template:create'" type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button v-permission="'template:create'" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && categories.length === 0" description="暂无分类" />

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="分类名称">
          <el-input v-model="form.name" placeholder="请输入分类名称" maxlength="30" />
        </el-form-item>
        <el-form-item label="排序号">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
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