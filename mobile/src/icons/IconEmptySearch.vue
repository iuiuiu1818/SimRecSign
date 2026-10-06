<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 120 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="55" cy="40" r="20" :stroke="color" stroke-width="1.5" opacity="0.5" />
    <line x1="70" y1="55" x2="85" y2="70" :stroke="color" stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
    <path d="M40 35l6 6 12-12" :stroke="color" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" />
    <rect x="30" y="65" width="55" height="3" rx="1.5" :fill="color" opacity="0.15" />
    <rect x="35" y="72" width="45" height="3" rx="1.5" :fill="color" opacity="0.1" />
    <rect x="40" y="79" width="35" height="3" rx="1.5" :fill="color" opacity="0.08" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: number | string
  color?: string
}>(), {
  size: 120,
  color: 'var(--srs-text-tertiary)',
})
</script>