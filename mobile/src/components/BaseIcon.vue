<script setup lang="ts">
import { computed } from 'vue'
import {
  IconHome,
  IconTemplate,
  IconDocument,
  IconBell,
  IconSetting,
  IconArrowLeft,
  IconArrowRight,
  IconClose,
  IconSearch,
  IconMore,
  IconCheck,
  IconWarning,
  IconError,
  IconInfo,
  IconPending,
  IconUndo,
  IconPlus,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconUpload,
  IconDownload,
  IconLink,
  IconFileText,
  IconSignature,
  IconPen,
  IconCertificate,
  IconUser,
  IconChart,
  IconNotification,
  IconFlag,
  IconLogo,
  IconEmpty,
  IconEmptySearch,
  IconSun,
  IconMoon,
  IconClock,
  IconInbox,
  IconCheckCircle,
  IconZap,
  IconSend,
  IconCalendar,
  IconLayoutGrid,
} from '../icons'

const props = withDefaults(defineProps<{
  name: string
  size?: number | string
  color?: string
}>(), {
  size: 24,
  color: 'currentColor',
})

const iconMap: Record<string, any> = {
  home: IconHome,
  template: IconTemplate,
  document: IconDocument,
  bell: IconBell,
  setting: IconSetting,
  'arrow-left': IconArrowLeft,
  'arrow-right': IconArrowRight,
  close: IconClose,
  search: IconSearch,
  more: IconMore,
  check: IconCheck,
  warning: IconWarning,
  error: IconError,
  info: IconInfo,
  pending: IconPending,
  undo: IconUndo,
  plus: IconPlus,
  edit: IconEdit,
  trash: IconTrash,
  refresh: IconRefresh,
  upload: IconUpload,
  download: IconDownload,
  link: IconLink,
  'file-text': IconFileText,
  signature: IconSignature,
  pen: IconPen,
  certificate: IconCertificate,
  user: IconUser,
  chart: IconChart,
  notification: IconNotification,
  flag: IconFlag,
  logo: IconLogo,
  empty: IconEmpty,
  'empty-search': IconEmptySearch,
  sun: IconSun,
  moon: IconMoon,
  clock: IconClock,
  inbox: IconInbox,
  'check-circle': IconCheckCircle,
  zap: IconZap,
  send: IconSend,
  calendar: IconCalendar,
  grid: IconLayoutGrid,
}

const current = computed(() => {
  const icon = iconMap[props.name]
  if (!icon && import.meta.env.DEV) {
    console.warn(`[BaseIcon] Unknown icon name: "${props.name}"`)
  }
  return icon || IconInfo
})
</script>

<template>
  <component :is="current" :size="size" :color="color" />
</template>