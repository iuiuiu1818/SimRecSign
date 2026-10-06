<script setup lang="ts">
import { ref, onMounted, onActivated, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { authAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { useSignatureTempStore } from '@/stores/signature'
import { showToast, showDialog } from 'vant'

const router = useRouter()
const userStore = useUserStore()
const sigTempStore = useSignatureTempStore()
const password = ref('')
const loading = ref(false)
const previewUrl = ref('')
const showPreview = ref(false)
const activeTab = ref(0)
const handwrittenDataUrl = ref('')

function checkTempSignature() {
  const temp = sigTempStore.consumeTemp()
  if (temp) {
    handwrittenDataUrl.value = temp.image
  }
}
onMounted(checkTempSignature)
onActivated(checkTempSignature)

function goSignPad() {
  router.push('/sign?from=settings')
}

function setHasSignatureImage(val: boolean) {
  userStore.hasSignatureImage = val
  localStorage.setItem('hasSignatureImage', String(val))
}

async function handleSave() {
  if (!password.value) { showToast('请输入签名密码'); return }
  loading.value = true
  const formData = new FormData()
  formData.append('password', password.value)

  if (activeTab.value === 0) {
    if (!handwrittenDataUrl.value) {
      showToast('请先去横屏签名')
      loading.value = false
      return
    }
    const blob = dataURLToBlob(handwrittenDataUrl.value)
    formData.append('file', blob, 'signature.png')
  } else {
    showToast('请通过上方上传区域选择图片')
    loading.value = false
    return
  }

  try {
    await authAPI.uploadSignatureImage(formData)
    showToast('保存成功')
    setHasSignatureImage(true)
  } catch (e: any) {
    showToast(e?.message || '保存失败')
  } finally {
    loading.value = false
  }
}

function dataURLToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bytes = atob(parts[1])
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

async function handlePreview() {
  if (!password.value) { showToast('请输入签名密码'); return }
  try {
    const blob: any = await authAPI.getSignatureImagePreview(password.value)
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
    previewUrl.value = URL.createObjectURL(blob)
    showPreview.value = true
  } catch (e: any) {
    showToast(e?.message || '预览失败')
  }
}

async function handleDelete() {
  if (!password.value) { showToast('请输入签名密码'); return }
  showDialog({
    title: '确认删除',
    message: '确定删除签名图？',
    confirmButtonText: '删除',
  }).then(async () => {
    try {
      await authAPI.deleteSignatureImage(password.value)
      showToast('已删除')
      setHasSignatureImage(false)
    } catch (e: any) {
      showToast(e?.message || '删除失败')
    }
  }).catch(() => {})
}

function onFileUpload(file: File) {
  if (!password.value) {
    showToast('请输入签名密码');
    return;
  }
  const formData = new FormData()
  formData.append('file', file)
  formData.append('password', password.value)
  authAPI.uploadSignatureImage(formData).then(() => {
    showToast('上传成功')
    setHasSignatureImage(true)
  }).catch((e: any) => {
    showToast(e?.message || '上传失败')
  })
}

onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<template>
  <div class="page-container">
    <van-form @submit="handleSave">
      <van-cell-group inset>
        <van-field v-model="password" label="签名密码" type="password" placeholder="请输入签名密码验证身份" :rules="[{ required: true, message: '请输入签名密码' }]" />
      </van-cell-group>

      <van-tabs v-model:active="activeTab" class="sig-tabs">
        <van-tab title="手写绘制">
          <div class="signature-pad">

            <div v-if="handwrittenDataUrl" class="handwritten-preview">
              <img :src="handwrittenDataUrl" alt="手写签名预览" />
            </div>
            <div v-else class="handwritten-empty muted">尚未手写签名</div>
            <van-button round block plain type="primary" @click="goSignPad">
              {{ handwrittenDataUrl ? '重新签名' : '去横屏签名' }}
            </van-button>
            <p class="upload-tip muted">跳转横屏签名页手写，与填写文档时的签名体验一致</p>
          </div>
        </van-tab>
        <van-tab title="上传图片">
          <div class="upload-area">
            <van-uploader :after-read="(f: any) => onFileUpload(f.file)" accept="image/png" :max-size="1048576">
              <van-button plain type="primary" block>选择 PNG 图片</van-button>
            </van-uploader>
            <p class="upload-tip muted">支持 PNG 格式，≤1MB</p>
          </div>
        </van-tab>
      </van-tabs>

      <div class="btn-wrapper">
        <van-button round block type="primary" native-type="submit" :loading="loading" loading-text="保存中...">保存签名</van-button>
      </div>

      <div v-if="userStore.hasSignatureImage" class="btn-wrapper">
        <van-button round block plain @click="handlePreview">预览签名</van-button>
        <van-button round block plain type="danger" style="margin-top: 10px;" @click="handleDelete">删除签名</van-button>
      </div>
    </van-form>

    <van-dialog v-model:show="showPreview" title="签名预览">
      <img v-if="previewUrl" :src="previewUrl" style="width: 100%; padding: 16px; box-sizing: border-box;" />
    </van-dialog>
  </div>
</template>

<style scoped>
.sig-tabs {
  margin: 16px 0;
}

.signature-pad {
  padding: 12px;
}

.handwritten-preview {
  background: #fff;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 12px;
}

.handwritten-preview img {
  display: block;
  width: 100%;
  max-height: 160px;
  object-fit: contain;
}

.handwritten-empty {
  padding: 32px 0;
  text-align: center;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}

.upload-area {
  padding: 24px 16px;
}

.upload-tip {
  font-size: 12px;
  text-align: center;
  margin-top: 12px;
}

.btn-wrapper {
  padding: 8px 16px 24px;
}
</style>