<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >

    <rect x="4" y="6" width="16" height="20" rx="2" :stroke="color" stroke-width="1.6" fill="none" />
    <path d="M8 12h8M8 16h6" :stroke="color" stroke-width="1.6" stroke-linecap="round" />

    <path d="M24 10l3 3-11 11-4 1 1-4 11-11z" :stroke="color" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />

    <path d="M26 8l-9 9-3-3" :stroke="color" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />

    <path d="M28 4l-1.5 3-3 .5 2 2-.5 3 3-1.5 3 1.5-.5-3 2-2-3-.5L28 4z" :fill="color" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: number | string
  color?: string
}>(), {
  size: 32,
  color: 'var(--srs-primary)',
})
</script>