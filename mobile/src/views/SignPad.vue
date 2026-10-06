<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSignatureTempStore } from '@/stores/signature'
import { showToast } from 'vant'
import SmoothSignaturePad from '@/components/SmoothSignaturePad.vue'

const route = useRoute()
const router = useRouter()
const sigTempStore = useSignatureTempStore()

const fromSettings = computed(() => route.query.from === 'settings')

const signatureRef = ref<typeof SmoothSignaturePad>()
const saveSignature = ref(false)

const viewport = ref({ w: window.innerWidth, h: window.innerHeight })

const isPortrait = ref(window.innerWidth <= window.innerHeight)

const pageStyle = computed(() => {
  if (!isPortrait.value) return undefined
  return { width: `${viewport.value.h}px`, height: `${viewport.value.w}px` }
})

function readLandscape(): boolean {
  if (window.innerWidth > window.innerHeight) return true
  const type = screen.orientation?.type
  if (typeof type === 'string') return type.startsWith('landscape')
  const angle = (window as any).orientation
  return typeof angle === 'number' ? Math.abs(angle) === 90 : false
}

function applyOrientation() {
  const w = window.innerWidth
  const h = window.innerHeight
  const sizeChanged = w !== viewport.value.w || h !== viewport.value.h
  viewport.value = { w, h }
  const nowPortrait = !readLandscape()
  const orientationChanged = nowPortrait !== isPortrait.value
  isPortrait.value = nowPortrait
  if (orientationChanged || sizeChanged) {
    setTimeout(() => {
      signatureRef.value?.resize?.()
    }, 120)
  }
}

const RECHECK_DELAYS = [100, 300, 700]
let recheckTimers: number[] = []

function scheduleRecheck() {
  recheckTimers.forEach((t) => clearTimeout(t))
  applyOrientation()
  recheckTimers = RECHECK_DELAYS.map((d) => window.setTimeout(applyOrientation, d))
}

const orientationMql = window.matchMedia('(orientation: landscape)')
const onMqlChange = () => scheduleRecheck()
const onViewportEvent = () => scheduleRecheck()

onMounted(() => {
  if (typeof orientationMql.addEventListener === 'function') {
    orientationMql.addEventListener('change', onMqlChange)
  } else {
    ;(orientationMql as any).addListener?.(onMqlChange)
  }
  window.addEventListener('resize', onViewportEvent)
  window.addEventListener('orientationchange', onViewportEvent)
  applyOrientation()
})

onUnmounted(() => {
  recheckTimers.forEach((t) => clearTimeout(t))
  recheckTimers = []
  if (typeof orientationMql.removeEventListener === 'function') {
    orientationMql.removeEventListener('change', onMqlChange)
  } else {
    ;(orientationMql as any).removeListener?.(onMqlChange)
  }
  window.removeEventListener('resize', onViewportEvent)
  window.removeEventListener('orientationchange', onViewportEvent)
})

function handleCancel() {
  router.back()
}

async function handleNext() {
  if (!signatureRef.value) {
    showToast('签名异常，请重试')
    return
  }

  if (signatureRef.value.isEmpty?.()) {
    showToast('请先签名')
    return
  }

  const dataUrl = signatureRef.value.toDataURL?.()
  if (!dataUrl || dataUrl === 'data:,') {
    showToast('签名生成失败')
    return
  }

  sigTempStore.setTemp(dataUrl, saveSignature.value)

  router.back()
}
</script>

<template>

  <div class="sign-pad-page" :class="{ 'force-landscape': isPortrait }" :style="pageStyle">

    <div class="top-bar">
      <span class="btn-cancel" @click="handleCancel">取消</span>
      <span class="title">请签名</span>
      <span class="btn-next" @click="handleNext">下一步</span>
    </div>

    <div class="signature-area">
      <SmoothSignaturePad
        ref="signatureRef"
        :width="600"
        :height="300"
        pen-color="#000000"
        clear-text="清空"
        undo-text="撤销"
        :fullscreen="true"
        :extra-slot="!fromSettings"
        :rotate="isPortrait ? 90 : 0"
      >
        <template v-if="!fromSettings" #extra>
          <van-checkbox v-model="saveSignature" icon-size="14">保存为默认签名</van-checkbox>
        </template>
      </SmoothSignaturePad>
    </div>
  </div>
</template>

<style scoped>

.sign-pad-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--srs-bg-card);
  overflow: hidden;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.sign-pad-page.force-landscape {
  transform: rotate(90deg) translateY(-100%);
  transform-origin: top left;
}

.top-bar {
  height: 46px;
  background: var(--srs-bg-card);
  border-bottom: 1px solid var(--srs-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  flex-shrink: 0;
  box-sizing: border-box;

  position: relative;
  z-index: 10;
}

.btn-cancel,
.btn-next {
  font-size: 14px;
  cursor: pointer;
  padding: 8px 12px;
  line-height: 1.4;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-cancel:hover,
.btn-next:hover {
  background: var(--srs-bg-hover);
}

.btn-cancel:active,
.btn-next:active {
  background: var(--srs-bg-active, #e5e7eb);
}

.btn-cancel {
  color: var(--srs-text-secondary);
}

.btn-next {
  color: var(--srs-primary);
  font-weight: 600;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--srs-text-primary);
  flex-shrink: 0;
}

.signature-area {
  flex: 1;
  padding: 0;
  overflow: hidden;
  background: var(--srs-bg-page);
  display: flex;
  align-items: stretch;
}
</style>
