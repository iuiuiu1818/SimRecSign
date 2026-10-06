import { ref, shallowRef, markRaw, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import type { Ref } from 'vue'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

const MIN_SCALE = 0.5
const MAX_SCALE = 3

export function usePdfRenderer(
  pdfUrl: Ref<string>,
  canvasRef: Ref<HTMLCanvasElement | null>
) {
  const pdfDoc = shallowRef<any>(null)
  const currentPage = ref(1)
  const totalPages = ref(0)

  const scale = ref(1.5)
  const pageScale = ref(1.5)

  const loading = ref(true)
  const pageError = ref('')

  let isActive = true
  let renderingPromise: Promise<void> | null = null

  const pageWidth = ref(0)
  const pageHeight = ref(0)

  const zoomPercent = computed(() => Math.round(scale.value * 100))

  function safeDestroy(doc: any) {
    if (doc && typeof doc.destroy === 'function') {
      doc.destroy().catch(() => {})
    }
  }

  async function queueRenderPage() {
    if (renderingPromise) {
      try { await renderingPromise } catch {}
      if (!pdfDoc.value || !canvasRef.value || !isActive) return
    }
    renderingPromise = renderPage()
    try {
      await renderingPromise
    } finally {
      renderingPromise = null
    }
  }

  async function loadPDF() {
    if (!pdfUrl.value) {
      loading.value = false
      return
    }
    loading.value = true
    pageError.value = ''
    try {
      pdfDoc.value = markRaw(await pdfjsLib.getDocument(pdfUrl.value).promise)
      if (!isActive) { safeDestroy(pdfDoc.value); pdfDoc.value = null; return }
      totalPages.value = pdfDoc.value.numPages
      currentPage.value = 1
      await nextTick()
      if (!isActive) { safeDestroy(pdfDoc.value); pdfDoc.value = null; return }
      await queueRenderPage()
    } catch (e: any) {
      if (!isActive) return
      pageError.value = e?.message || '加载 PDF 失败'
      console.error('PDF load error:', e)
    } finally {
      if (isActive) loading.value = false
    }
  }

  async function renderPage() {
    if (!pdfDoc.value || !canvasRef.value) return

    const page = await pdfDoc.value.getPage(currentPage.value)
    if (!isActive) { page.cleanup(); return }
    const viewport = page.getViewport({ scale: scale.value })

    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = viewport.width
    canvas.height = viewport.height
    pageWidth.value = viewport.width
    pageHeight.value = viewport.height

    pageScale.value = scale.value

    await page.render({ canvasContext: ctx, viewport }).promise
    if (!isActive) { page.cleanup(); return }
    page.cleanup()
  }

  function goToPage(p: number) {
    if (p >= 1 && p <= totalPages.value) currentPage.value = p
  }

  function setScale(v: number) {
    const nv = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(v * 100) / 100))
    if (nv === scale.value) return
    scale.value = nv
    queueRenderPage()
  }

  function zoomIn() { setScale(scale.value + 0.25) }
  function zoomOut() { setScale(scale.value - 0.25) }
  function resetZoom() { setScale(1) }

  function onWheel(e: WheelEvent) {
    if (!e.ctrlKey) return
    e.deltaY < 0 ? zoomIn() : zoomOut()
  }

  function getRelativePos(e: MouseEvent | DragEvent): { x: number; y: number } {
    const rect = canvasRef.value?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  onMounted(async () => {
    isActive = true
    await loadPDF()
  })

  onUnmounted(() => {
    isActive = false
    renderingPromise = null
    safeDestroy(pdfDoc.value)
    pdfDoc.value = null
  })

  watch(pdfUrl, () => {
    if (!isActive) return
    safeDestroy(pdfDoc.value)
    pdfDoc.value = null
    loadPDF()
  })

  watch(currentPage, () => {
    if (!isActive) return
    queueRenderPage()
  })

  return {
    pdfDoc,
    currentPage,
    totalPages,
    scale,
    pageScale,
    loading,
    pageError,
    pageWidth,
    pageHeight,
    zoomPercent,
    MIN_SCALE,
    MAX_SCALE,
    goToPage,
    zoomIn,
    zoomOut,
    resetZoom,
    onWheel,
    getRelativePos,
    safeDestroy,
  }
}