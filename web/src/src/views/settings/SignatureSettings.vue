<script setup lang="ts">
import { ref } from 'vue'
import { authAPI } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const activeTab = ref('draw')
const signPassword = ref('')
const saving = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
const uploadedFile = ref<File | null>(null)

const previewUrl = ref<string | null>(null)
const previewLoading = ref(false)
const previewDialogVisible = ref(false)

function startDrawing(e: MouseEvent | TouchEvent) {
  isDrawing.value = true
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const rect = canvas.getBoundingClientRect()
  const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
  const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function draw(e: MouseEvent | TouchEvent) {
  if (!isDrawing.value) return
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const rect = canvas.getBoundingClientRect()
  const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
  const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#000'
  ctx.lineTo(x, y)
  ctx.stroke()
}

function stopDrawing() {
  isDrawing.value = false
}

function clearCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

function getCanvasBlob(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const canvas = canvasRef.value
    if (!canvas) { resolve(null); return }
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

function handleFileChange(file: File) {
  uploadedFile.value = file
  return false
}

async function handleSave() {
  if (!signPassword.value) {
    ElMessage.warning('请先验证签名密码')
    return
  }
  saving.value = true
  try {
    let blob: Blob | null = null
    if (activeTab.value === 'draw') {
      blob = await getCanvasBlob()
    } else if (uploadedFile.value) {
      blob = uploadedFile.value
    }
    if (!blob) {
      ElMessage.warning(activeTab.value === 'draw' ? '请先在画布上绘制签名' : '请上传签名图片')
      return
    }
    const formData = new FormData()
    formData.append('file', blob, 'signature.png')
    formData.append('password', signPassword.value)
    await authAPI.uploadSignatureImage(formData)
    ElMessage.success('签名保存成功')
    userStore.hasSignatureImage = true
    localStorage.setItem('hasSignatureImage', 'true')
  } catch {   }
  finally { saving.value = false }
}

async function handlePreview() {
  if (!signPassword.value) {
    ElMessage.warning('请先输入签名密码以验证身份')
    return
  }
  previewLoading.value = true
  try {
    const res: any = await authAPI.getSignatureImagePreview(signPassword.value)
    const url = URL.createObjectURL(res)
    previewUrl.value = url
    previewDialogVisible.value = true
  } catch {
  } finally {
    previewLoading.value = false
  }
}

async function handleDelete() {
  if (!signPassword.value) {
    ElMessage.warning('请先输入签名密码以验证身份')
    return
  }
  try {
    await ElMessageBox.confirm(
      '确定要删除当前签名图片吗？删除后需重新上传。',
      '确认删除',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
    await authAPI.deleteSignatureImage(signPassword.value)
    ElMessage.success('签名已删除')
    userStore.hasSignatureImage = false
    localStorage.setItem('hasSignatureImage', 'false')
    previewUrl.value = null
  } catch {
  }
}

function cleanupPreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
}
</script>

<template>
  <div class="settings-card-wrapper">
    <el-card shadow="never" class="settings-card">
      <template #header><span class="card-title">我的签名</span></template>
      <p class="card-desc">绘制或上传您的签名图片，签名将加密存储于您的签名档案中。</p>

      <div v-if="userStore.hasSignatureImage" class="status-bar">
        <el-tag type="success" effect="plain" style="margin-bottom: 12px">已上传签名图片</el-tag>
        <div class="action-row">
          <el-button size="small" type="primary" plain :loading="previewLoading" @click="handlePreview">
            查看签名
          </el-button>
          <el-button size="small" type="danger" plain @click="handleDelete">
            删除签名
          </el-button>
        </div>
      </div>
      <div v-else class="status-bar">
        <el-tag type="info" effect="plain" style="margin-bottom: 12px">尚未上传签名图片</el-tag>
      </div>

      <el-form label-position="top" style="max-width: 480px">
        <el-form-item label="签名密码（需验证身份）">
          <el-input v-model="signPassword" type="password" show-password placeholder="请输入签名密码" />
        </el-form-item>
      </el-form>

      <el-tabs v-model="activeTab" style="margin-bottom: 16px">
        <el-tab-pane label="画布绘制" name="draw">
          <div class="canvas-wrapper">
            <canvas
              ref="canvasRef"
              width="400"
              height="200"
              class="signature-canvas"
              @mousedown="startDrawing"
              @mousemove="draw"
              @mouseup="stopDrawing"
              @mouseleave="stopDrawing"
              @touchstart.prevent="startDrawing"
              @touchmove.prevent="draw"
              @touchend="stopDrawing"
            />
            <el-button size="small" @click="clearCanvas" style="margin-top: 8px">清空重绘</el-button>
          </div>
        </el-tab-pane>
        <el-tab-pane label="上传 PNG" name="upload">
          <el-upload
            drag
            accept="image/png"
            :auto-upload="false"
            :limit="1"
            :on-change="(u: any) => handleFileChange(u.raw)"
            :show-file-list="true"
          >
            <el-icon class="el-icon--upload" style="font-size: 48px"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽 PNG 文件到此处，或 <em>点击选择</em></div>
            <div class="el-upload__tip">仅支持 PNG 格式，文件大小不超过 1MB</div>
          </el-upload>
        </el-tab-pane>
      </el-tabs>

      <div class="hint-text">
        <template v-if="userStore.hasSignatureImage">提示：已有签名图片，重新保存将覆盖现有签名。</template>
      </div>

      <el-button type="primary" :loading="saving" @click="handleSave">保存签名</el-button>
    </el-card>

    <el-dialog v-model="previewDialogVisible" title="签名预览" width="420px" @close="cleanupPreview">
      <div style="text-align: center; padding: 20px;">
        <img v-if="previewUrl" :src="previewUrl" alt="签名预览" style="max-width: 100%; max-height: 200px; border: 1px solid var(--srs-border); border-radius: 8px;" />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.settings-card-wrapper {
  max-width: 640px;
}
.settings-card {
  border-radius: var(--srs-radius-lg);
  border: 1px solid var(--srs-border);
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--srs-text-primary);
}
.card-desc {
  color: var(--srs-text-tertiary);
  font-size: 13px;
  margin-bottom: 16px;
}
.hint-text {
  color: var(--srs-text-tertiary);
  font-size: 12px;
  margin-bottom: 12px;
}
.canvas-wrapper {
  margin-bottom: 8px;
}
.signature-canvas {
  border: 1px dashed var(--srs-border-input);
  border-radius: 8px;
  cursor: crosshair;
  touch-action: none;
  width: 100%;
  max-width: 400px;
  height: 200px;
  background: var(--srs-bg-card);
}
.status-bar {
  margin-bottom: 16px;
}
.action-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
</style>