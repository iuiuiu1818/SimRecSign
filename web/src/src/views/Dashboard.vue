<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { templateAPI, documentAPI } from '@/api'
import { ElMessage } from 'element-plus'

const router = useRouter()

const stats = ref({
  pendingSign: 0,
  completed: 0,
  activeTemplates: 0,
})

const templates = ref<any[]>([])
const initiateDialog = ref(false)
const initiateForm = ref({
  templateId: '',
  title: '',
})
const initiating = ref(false)

onMounted(async () => {
  try {
    const tplRes: any = await templateAPI.list({ pageSize: 10 })
    templates.value = tplRes.data?.list || []
    stats.value.activeTemplates = tplRes.data?.total || 0

    const docRes: any = await documentAPI.list({ pageSize: 100 })
    const docs = docRes.data?.list || []
    stats.value.pendingSign = docs.filter((d: any) => d.status === 'in_progress').length
    stats.value.completed = docs.filter((d: any) => d.status === 'completed').length
  } catch {
  }
})

function openInitiate(tpl: any) {
  initiateForm.value.templateId = tpl.id
  initiateForm.value.title = tpl.name
  initiateDialog.value = true
}

async function handleInitiate() {
  if (!initiateForm.value.templateId) return
  initiating.value = true
  try {
    const res: any = await documentAPI.initiate(initiateForm.value)
    ElMessage.success('流程已发起')
    initiateDialog.value = false
    router.push(`/documents/${res.data.id}/fill`)
  } catch {
  } finally {
    initiating.value = false
  }
}
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <h2 class="page-title">工作台</h2>
    </div>

    <el-row :gutter="24" class="stats-row">
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-body">
            <div class="stat-icon pending">
              <el-icon :size="28"><EditPen /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingSign }}</div>
              <div class="stat-label">待我签署</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-body">
            <div class="stat-icon success">
              <el-icon :size="28"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.completed }}</div>
              <div class="stat-label">已完成</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-body">
            <div class="stat-icon info">
              <el-icon :size="28"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.activeTemplates }}</div>
              <div class="stat-label">活动模板数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="24">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="section-header">
              <span>快捷发起</span>
            </div>
          </template>
          <div v-if="templates.length > 0" class="template-grid">
            <div
              v-for="tpl in templates"
              :key="tpl.id"
              class="template-item"
              @click="openInitiate(tpl)"
            >
              <el-icon :size="20"><DocumentCopy /></el-icon>
              <span class="template-name">{{ tpl.name }}</span>
              <el-tag v-if="tpl.category" size="small" effect="plain">{{ tpl.category }}</el-tag>
            </div>
          </div>
          <el-empty v-else description="暂无可用模板，请先在模板库创建" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="section-header">
              <span>快捷入口</span>
            </div>
          </template>
          <div class="quick-actions">
            <div class="quick-action-item" @click="router.push('/templates')">
              <el-icon :size="24"><Plus /></el-icon>
              <span>新建模板</span>
            </div>
            <div class="quick-action-item" @click="router.push('/documents')">
              <el-icon :size="24"><Search /></el-icon>
              <span>查看文档</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="initiateDialog" title="发起流程" width="480px">
      <el-form :model="initiateForm" label-position="top">
        <el-form-item label="流程标题">
          <el-input v-model="initiateForm.title" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="initiateDialog = false">取消</el-button>
        <el-button type="primary" :loading="initiating" @click="handleInitiate">确认发起</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dashboard {

  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--srs-text-primary);
  margin: 0;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: var(--srs-radius-lg);
  border: 1px solid var(--srs-border);
  transition: box-shadow var(--srs-transition-normal), transform var(--srs-transition-normal);
}

.stat-card:hover {
  box-shadow: var(--srs-shadow-md);
  transform: translateY(-2px);
}

.stat-body {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 4px 0;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.pending {
  background: var(--srs-primary-bg);
  color: var(--srs-primary);
}

.stat-icon.success {
  background: var(--srs-success-bg);
  color: var(--srs-success);
}

.stat-icon.info {
  background: var(--srs-info-bg);
  color: var(--srs-info);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--srs-text-primary);
  line-height: 1.1;
}

.stat-label {
  font-size: 14px;
  color: var(--srs-text-tertiary);
  margin-top: 4px;
}

.section-card {
  border-radius: var(--srs-radius-lg);
  border: 1px solid var(--srs-border);
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--srs-border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color var(--srs-transition-fast), background var(--srs-transition-fast);
  color: var(--srs-text-secondary);
}

.template-item:hover {
  border-color: var(--srs-primary);
  background: var(--srs-primary-bg);
}

.template-item :deep(.el-icon) {
  color: var(--srs-primary);
}

.template-name {
  font-size: 14px;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--srs-border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color var(--srs-transition-fast), background var(--srs-transition-fast);
  color: var(--srs-text-secondary);
  font-size: 14px;
  font-weight: 500;
}

.quick-action-item:hover {
  border-color: var(--srs-primary);
  background: var(--srs-primary-bg);
}

.quick-action-item :deep(.el-icon) {
  color: var(--srs-primary);
}
</style>