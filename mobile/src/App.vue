<script setup lang="ts">
import { onMounted } from 'vue'
import { usePermissionStore } from '@/stores/permission'
import PageTransition from '@/components/PageTransition.vue'

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
  <PageTransition />
</template>