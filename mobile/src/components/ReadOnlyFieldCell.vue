<script setup lang="ts">
import { computed } from 'vue'
import { isImageFieldType, isImageValue } from '@/utils/fieldBlocks'
import type { FieldNode } from '@/utils/fieldBlocks'

const props = withDefaults(defineProps<{
  field: FieldNode
  value: any
  showSignedBadge?: boolean
}>(), {
  showSignedBadge: true,
})

const displayValue = computed(() => {
  const v = props.value
  if (v === undefined || v === null || v === '') return '-'
  if (typeof v === 'boolean') return v ? '是' : '否'
  return String(v)
})

const isImage = computed(() =>
  isImageFieldType(props.field.type) && isImageValue(props.value)
)

const isSignatureImage = computed(() =>
  props.field.type === 'signature' && props.value
)

const showSigned = computed(() =>
  props.showSignedBadge && props.field.type === 'signature' && props.value
)
</script>

<template>
  <van-cell :title="field.label" :label="field.description">
    <template #value>
      <img
        v-if="isImage"
        :src="value"
        class="field-image"
        alt=""
      />
      <img
        v-else-if="isSignatureImage"
        :src="value"
        class="field-image"
        alt=""
      />
      <span v-else>{{ displayValue }}</span>
      <span v-if="showSigned" class="signed-badge">已签署</span>
    </template>
  </van-cell>
</template>

<style scoped>
.field-image {
  max-width: 100%;
  max-height: 120px;
  border-radius: 6px;
  object-fit: contain;
  display: block;
}

.signed-badge {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 10px;
  background: var(--srs-success-bg);
  color: var(--srs-success);
  font-size: 12px;
}
</style>
