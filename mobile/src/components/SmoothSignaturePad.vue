<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { SmoothSignature } from '@/utils/smooth-signature'

interface Props {
  width?: number
  height?: number
  penColor?: string
  bgColor?: string
  lineWidth?: number
  clearText?: string
  undoText?: string
  fullscreen?: boolean
  extraSlot?: boolean
  rotate?: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 300,
  height: 160,
  penColor: '#000',
  bgColor: '',
  lineWidth: 3,
  clearText: '清空',
  undoText: '撤销',
  fullscreen: false,
  extraSlot: false,
  rotate: 0,
})

const undoTextComputed = computed(() => props.undoText)

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'end'): void
}>()

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const toolbarRef = ref<HTMLDivElement>()
const instance = ref<SmoothSignature>()

const pixelWidth = ref(props.width)
const pixelHeight = ref(props.height)

const isEmpty = ref(true)

function calcSize() {
  if (!containerRef.value) return
  if (props.fullscreen) {
    pixelWidth.value = containerRef.value.clientWidth
    const toolbarHeight = toolbarRef.value?.offsetHeight || 0
    pixelHeight.value = Math.max(containerRef.value.clientHeight - toolbarHeight, 0)
  } else {
    pixelWidth.value = containerRef.value.clientWidth || props.width
    pixelHeight.value = props.height
  }
}

onMounted(async () => {
  if (!canvasRef.value) return
  await nextTick()
  calcSize()
  instance.value = new SmoothSignature(canvasRef.value, {
    width: pixelWidth.value,
    height: pixelHeight.value,
    color: props.penColor,
    bgColor: props.bgColor,
    rotate: props.rotate,
    openSmooth: true,
    minWidth: props.lineWidth,
    maxWidth: props.lineWidth * 5,
    onStart: () => {
      isEmpty.value = false
      emit('start')
    },
    onEnd: () => {
      emit('end')
    },
  })
})

watch(() => props.fullscreen, async () => {
  await nextTick()
  calcSize()
  if (instance.value) {
    instance.value.resize(pixelWidth.value, pixelHeight.value)
  }
})

watch(() => props.rotate, (val) => {
  if (instance.value) {
    instance.value.rotate = val ?? 0
  }
})

let resizeTimer: ReturnType<typeof setTimeout> | null = null
const onResize = () => {
  if (resizeTimer) {
    clearTimeout(resizeTimer)
  }
  resizeTimer = setTimeout(() => {
    if (props.fullscreen && instance.value) {
      calcSize()
      instance.value.resize(pixelWidth.value, pixelHeight.value)
    }
  }, 150)
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onResize)
  }
})

onBeforeUnmount(() => {
  if (resizeTimer) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', onResize)
  }
  instance.value?.removeListener()
})

function handleClear() {
  instance.value?.clear()
  isEmpty.value = true
}

function handleUndo() {
  instance.value?.undo()
  isEmpty.value = instance.value?.isEmpty?.() ?? true
}

function toDataURL(type = 'image/png', quality = 1): string {
  return instance.value?.toDataURL(type, quality) || ''
}

function isEmptyCanvas(): boolean {
  return instance.value?.isEmpty() ?? true
}

function resizeContent() {
  calcSize()
  if (instance.value) {
    instance.value.resize(pixelWidth.value, pixelHeight.value)
  }
}

const getPixelSize = () => ({ width: pixelWidth.value, height: pixelHeight.value })

defineExpose({
  toDataURL,
  isEmpty: isEmptyCanvas,
  clear: handleClear,
  reset: handleClear,
  undo: handleUndo,
  resize: resizeContent,
  calcSize,
  get pixelWidth() { return pixelWidth.value },
  get pixelHeight() { return pixelHeight.value },
  get instance() { return instance.value },
})
</script>

<template>
  <div
    ref="containerRef"
    class="smooth-signature-pad"
    :class="{ 'smooth-signature-fullscreen': fullscreen }"
  >
    <canvas ref="canvasRef" class="smooth-canvas" />
    <div ref="toolbarRef" class="smooth-toolbar">
      <div class="toolbar-left">
        <van-button size="small" plain @click="handleUndo" :disabled="isEmpty">{{ undoTextComputed }}</van-button>
        <van-button size="small" plain @click="handleClear">{{ props.clearText }}</van-button>
      </div>
      <div v-if="props.extraSlot" class="toolbar-extra">
        <slot name="extra"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.smooth-signature-pad {
  border: 2px dashed var(--srs-border-input, #dcdfe6);
  border-radius: 8px;
  overflow: hidden;
  background: var(--srs-signature-bg, var(--srs-bg-card));
  display: flex;
  flex-direction: column;
}

.smooth-signature-fullscreen {
  border: none;
  border-radius: 0;
  width: 100%;
  height: 100%;
  position: relative;
}

.smooth-canvas {
  display: block;
  width: 100%;
  touch-action: none;
  flex: 1;
}

.smooth-signature-fullscreen .smooth-canvas {
  min-height: 0;
}

.smooth-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-top: 1px solid var(--srs-border-light, #ebeef5);
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.toolbar-extra {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--srs-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.smooth-signature-fullscreen .smooth-toolbar {
  background: var(--srs-bg-card);
  border-top: 1px solid var(--srs-border-light, #ebeef5);
  position: sticky;
  bottom: 0;
  z-index: 1;
}
</style>
