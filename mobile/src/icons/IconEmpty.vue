<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 120 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="10" y="15" width="60" height="70" rx="6" :stroke="color" stroke-width="1.5" opacity="0.3" />
    <rect x="25" y="10" width="60" height="70" rx="6" :stroke="color" stroke-width="1.5" opacity="0.5" />
    <rect x="40" y="5" width="60" height="70" rx="6" :stroke="color" stroke-width="1.5" opacity="0.8" />
    <path d="M52 25h28M52 33h24M52 41h20" :stroke="color" stroke-width="1.5" stroke-linecap="round" opacity="0.8" />
    <path d="M80 55l-8 8-4-4" :stroke="color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
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