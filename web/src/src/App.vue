<script setup lang="ts">
import { onMounted } from 'vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import { usePermissionStore } from '@/stores/permission'

onMounted(async () => {
  if (localStorage.getItem('token')) {
    const permStore = usePermissionStore()
    if (!permStore.loaded) {
      await permStore.loadPermissions()
    }
  }
})
</script>

<template>
  <ErrorBoundary>
    <router-view />
  </ErrorBoundary>
</template>