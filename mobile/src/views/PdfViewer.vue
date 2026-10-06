<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { documentAPI } from '@/api'
import { showToast } from 'vant'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

const route = useRoute()
const router = useRouter()
const docId = route.params.id as string

const canvasRef = ref<HTMLCanvasElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref('')
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.0)
const MIN_SCALE = 0.5
const MAX_SCALE = 3.0
const SCALE_STEP = 0.25

let pdfDoc: any = null
let isActive = true
let renderingPromise: Promise<void> | null = null
let renderScale = 1.0
let canvasW = 0
let canvasH = 0

let pinchStartDist = 0
let pinchStartScale = 1.0
let lastTapTime = 0
let isPinching = false
let touchEventsBound = false

const pdfUrl = computed(() => `/api/v1/documents/${docId}/pdf`)
const zoomPercent = computed(() => Math.round(scale.value * 100))

function safeDestroy(doc: any) {
  if (doc && typeof doc.destroy === 'function') {
    doc.destroy().catch(() => {})
  }
}

async function loadPDF() {
  if (!isActive) return
  loading.value = true
  error.value = ''
  try {
    const blob: any = await documentAPI.downloadPDF(docId)
    const buffer = await blob.arrayBuffer()
    pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise
    if (!isActive) { safeDestroy(pdfDoc); pdfDoc = null; return }
    totalPages.value = pdfDoc.numPages
    currentPage.value = 1
    await nextTick()
    if (!isActive) { safeDestroy(pdfDoc); pdfDoc = null; return }
    await renderPage()
  } catch (e: any) {
    if (!isActive) return
    error.value = e?.message || '加载 PDF 失败'
    console.error('[MobilePDFViewer] load error:', e)
  } finally {
    if (isActive) loading.value = false
  }
}

async function renderPage() {
  if (!pdfDoc || !canvasRef.value || !isActive) return
  if (renderingPromise) {
    try { await renderingPromise } catch {}
  }
  renderingPromise = (async () => {
    if (!pdfDoc || !canvasRef.value || !isActive) return
    const page = await pdfDoc.getPage(currentPage.value)
    const viewport = page.getViewport({ scale: scale.value })
    const canvas = canvasRef.value!
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = viewport.width
    canvas.height = viewport.height
    canvasW = viewport.width
    canvasH = viewport.height
    await page.render({ canvasContext: ctx, viewport }).promise
    if (!isActive) { page.cleanup(); return }
    page.cleanup()
    renderScale = scale.value
    canvas.style.width = canvasW + 'px'
    canvas.style.height = canvasH + 'px'
  })()
  try { await renderingPromise } catch {} finally { renderingPromise = null }
}

function applyVisualZoom() {
  if (!canvasRef.value) return
  const ratio = scale.value / renderScale
  canvasRef.value.style.width = Math.round(canvasW * ratio) + 'px'
  canvasRef.value.style.height = Math.round(canvasH * ratio) + 'px'
}

function goToPage(n: number) {
  if (n >= 1 && n <= totalPages.value) currentPage.value = n
}

function zoomIn() {
  scale.value = Math.min(MAX_SCALE, Math.round((scale.value + SCALE_STEP) * 100) / 100)
  renderPage()
}
function zoomOut() {
  scale.value = Math.max(MIN_SCALE, Math.round((scale.value - SCALE_STEP) * 100) / 100)
  renderPage()
}
function resetZoom() {
  scale.value = 1.0
  renderPage()
}

function getTouchDist(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    isPinching = true
    pinchStartDist = getTouchDist(e.touches[0], e.touches[1])
    pinchStartScale = scale.value
  } else if (e.touches.length === 1) {
    const now = Date.now()
    if (now - lastTapTime < 300) {
      scale.value = scale.value < 1.5 ? 2.0 : 1.0
      renderPage()
    }
    lastTapTime = now
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 2 && pinchStartDist > 0) {
    e.preventDefault()
    const curDist = getTouchDist(e.touches[0], e.touches[1])
    const newScale = pinchStartScale * (curDist / pinchStartDist)
    scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(newScale * 100) / 100))
    applyVisualZoom()
  }
}

function onTouchEnd() {
  if (isPinching) {
    isPinching = false
    pinchStartDist = 0
    renderPage()
  }
}

function bindTouchEvents() {
  if (touchEventsBound || !wrapperRef.value) return
  wrapperRef.value.addEventListener('touchstart', onTouchStart, { passive: false })
  wrapperRef.value.addEventListener('touchmove', onTouchMove, { passive: false })
  wrapperRef.value.addEventListener('touchend', onTouchEnd)
  touchEventsBound = true
}

function unbindTouchEvents() {
  if (!touchEventsBound || !wrapperRef.value) return
  wrapperRef.value.removeEventListener('touchstart', onTouchStart)
  wrapperRef.value.removeEventListener('touchmove', onTouchMove)
  wrapperRef.value.removeEventListener('touchend', onTouchEnd)
  touchEventsBound = false
}

async function handleDownload() {
  try {
    const blob: any = await documentAPI.downloadPDF(docId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document-${docId}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e: any) {
    showToast(e?.message || '下载失败')
  }
}

onMounted(() => { loadPDF() })

onUnmounted(() => {
  isActive = false
  safeDestroy(pdfDoc)
  pdfDoc = null
  unbindTouchEvents()
})

watch(currentPage, () => { if (isActive) renderPage() })

watch(wrapperRef, (el) => {
  if (el) nextTick(() => bindTouchEvents())
})
</script>

<template>
  <div class="pdf-viewer">

    <div class="top-bar">
      <span class="btn-back" @click="router.back()">← 返回</span>
      <span class="title">PDF 查看</span>
      <span class="btn-download" @click="handleDownload">下载</span>
    </div>

    <div v-if="loading && !pdfDoc" class="pdf-loading">
      <van-loading size="24px">正在加载 PDF...</van-loading>
    </div>

    <div v-else-if="error" class="pdf-error">
      <van-empty description="PDF 加载失败" />
    </div>

    <div v-else ref="wrapperRef" class="pdf-canvas-wrapper">
      <canvas ref="canvasRef" class="pdf-canvas" />
    </div>

    <div class="bottom-bar">
      <van-button size="small" plain :disabled="scale <= MIN_SCALE" @click="zoomOut">
        <van-icon name="minus" />
      </van-button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <van-button size="small" plain :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
        <van-icon name="arrow-left" />
      </van-button>
      <van-button size="small" plain @click="resetZoom">{{ zoomPercent }}%</van-button>
      <van-button size="small" plain :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
        <van-icon name="arrow-right" />
      </van-button>
      <van-button size="small" plain :disabled="scale >= MAX_SCALE" @click="zoomIn">
        <van-icon name="plus" />
      </van-button>
    </div>
  </div>
</template>

<style scoped>
.pdf-viewer {
  position: fixed;
  inset: 0;
  background: var(--srs-bg-page);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  height: 46px;
  background: var(--srs-bg-card);
  border-bottom: 1px solid var(--srs-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  flex-shrink: 0;
  z-index: 10;
}

.btn-back,
.btn-download {
  font-size: 14px;
  color: var(--srs-primary);
  cursor: pointer;
  padding: 8px;
  margin: -8px;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
}

.pdf-loading,
.pdf-error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-canvas-wrapper {
  flex: 1;
  overflow: auto;

  -webkit-overflow-scrolling: touch;

  touch-action: pan-x pan-y;
}

.pdf-canvas {
  display: block;
  margin: 16px auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.bottom-bar {
  height: 52px;
  background: var(--srs-bg-card);
  border-top: 1px solid var(--srs-border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
  flex-shrink: 0;
}

.page-info {
  font-size: 13px;
  color: var(--srs-text-secondary);
  min-width: 60px;
  text-align: center;
}
</style>
