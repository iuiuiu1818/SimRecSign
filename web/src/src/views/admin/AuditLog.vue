<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { auditLogAPI } from '@/api'
import { ElMessage } from 'element-plus'

const logs = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const actionFilter = ref('')
const userIdFilter = ref('')
const keyword = ref('')
const chainValid = ref<boolean | null>(null)

async function loadLogs() {
  loading.value = true
  try {
    const res: any = await auditLogAPI.list({
      action: actionFilter.value || undefined,
      userId: userIdFilter.value || undefined,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    logs.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {   }
  loading.value = false
}

async function handleVerifyChain() {
  try {
    const res: any = await auditLogAPI.verifyChain()
    chainValid.value = res.data?.valid
    ElMessage.success(chainValid.value ? '哈希链完整，未发现篡改' : '哈希链存在断裂！')
  } catch {   }
}

const exporting = ref(false)
async function handleExport() {
  exporting.value = true
  try {
    await auditLogAPI.export({
      action: actionFilter.value || undefined,
      userId: userIdFilter.value || undefined,
      keyword: keyword.value || undefined,
    })
    ElMessage.success('导出已开始')
  } catch {   }
  exporting.value = false
}

function handleSearch() {
  page.value = 1
  loadLogs()
}

function actionLabel(action: string) {
  const m: Record<string, string> = {
    template_create: '创建模板',
    template_edit: '编辑模板',
    template_delete: '删除模板',
    template_publish: '发布模板',
    template_unpublish: '下架模板',
    doc_initiate: '发起流程',
    doc_withdraw: '撤回文档',
    doc_reject: '驳回文档',
    doc_preview: '预览文档',
    doc_download: '下载文档',
    doc_archive: '终稿生成',
    step_submit: '步骤提交',
    step_sign: '步骤签署',
    step_return: '步骤退回',
    step_view: '查看步骤',
    cert_upload: '上传证书',
    cert_delete: '删除证书',
    cert_expire: '证书过期',
    handoff_generate: '生成交接链接',
    handoff_revoke: '作废交接链接',
    handoff_bind: '绑定交接链接',
    login: '登录',
    logout: '登出',
  }
  return m[action] || action
}

function formatTime(t: string) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(loadLogs)
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>审计日志</span>
        <div>
          <el-button type="success" size="small" :loading="exporting" @click="handleExport">
            导出 CSV
          </el-button>
          <el-button type="warning" size="small" @click="handleVerifyChain">
            验证哈希链
          </el-button>
        </div>
      </div>
    </template>

    <el-alert
      v-if="chainValid !== null"
      :type="chainValid ? 'success' : 'error'"
      :title="chainValid ? '哈希链验证通过 — 未检测到篡改' : '哈希链断裂 — 存在篡改风险！'"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />

    <div class="toolbar">
      <el-form :inline="true" @keyup.enter="handleSearch">
        <el-form-item label="操作">
          <el-select v-model="actionFilter" placeholder="全部" clearable filterable style="width: 160px">
            <el-option-group label="模板">
              <el-option label="创建模板" value="template_create" />
              <el-option label="编辑模板" value="template_edit" />
              <el-option label="删除模板" value="template_delete" />
              <el-option label="发布模板" value="template_publish" />
              <el-option label="下架模板" value="template_unpublish" />
            </el-option-group>
            <el-option-group label="文档">
              <el-option label="发起流程" value="doc_initiate" />
              <el-option label="撤回文档" value="doc_withdraw" />
              <el-option label="驳回文档" value="doc_reject" />
              <el-option label="预览文档" value="doc_preview" />
              <el-option label="下载文档" value="doc_download" />
              <el-option label="终稿生成" value="doc_archive" />
            </el-option-group>
            <el-option-group label="步骤">
              <el-option label="步骤提交" value="step_submit" />
              <el-option label="步骤签署" value="step_sign" />
              <el-option label="步骤退回" value="step_return" />
              <el-option label="查看步骤" value="step_view" />
            </el-option-group>
            <el-option-group label="证书">
              <el-option label="上传证书" value="cert_upload" />
              <el-option label="删除证书" value="cert_delete" />
              <el-option label="证书过期" value="cert_expire" />
            </el-option-group>
            <el-option-group label="交接">
              <el-option label="生成交接链接" value="handoff_generate" />
              <el-option label="作废交接链接" value="handoff_revoke" />
              <el-option label="绑定交接链接" value="handoff_bind" />
            </el-option-group>
            <el-option-group label="认证">
              <el-option label="登录" value="login" />
              <el-option label="登出" value="logout" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="用户">
          <el-input v-model="userIdFilter" placeholder="用户ID" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="keyword" placeholder="搜索摘要/目标" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="logs" v-loading="loading" stripe border>
      <el-table-column label="操作" width="110">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ actionLabel(row.action) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="userName" label="操作人" width="100" />
      <el-table-column prop="summary" label="摘要" min-width="220" show-overflow-tooltip />
      <el-table-column prop="targetName" label="关联目标" width="150" show-overflow-tooltip />
      <el-table-column prop="ipAddress" label="IP" width="130" />
      <el-table-column label="时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="hash" label="哈希" width="100" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tooltip :content="row.hash" placement="top">
            <span class="hash-cell">{{ row.hash?.substring(0, 12) }}...</span>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && logs.length === 0" description="暂无审计日志" />

    <div class="pagination" v-if="total > pageSize">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="loadLogs"
      />
    </div>
  </el-card>
</template>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.toolbar {
  margin-bottom: 16px;
}
.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.hash-cell {
  font-family: var(--srs-font-mono);
  font-size: 12px;
  color: var(--srs-text-tertiary);
}
</style>
