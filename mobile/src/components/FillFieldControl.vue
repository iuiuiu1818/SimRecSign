<script setup lang="ts">
import { computed } from 'vue'
import { IconInfo } from '@/components'
import { isSuggestable } from '@/composables/useFieldHistory'
import type { FieldNode } from '@/utils/fieldBlocks'

const props = withDefaults(defineProps<{
  field: FieldNode
  modelValue: any
  historyCache?: Record<string, any[]>
  historyLoading?: Record<string, boolean>
}>(), {
  historyCache: () => ({}),
  historyLoading: () => ({}),
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'openDatePicker', field: FieldNode): void
  (e: 'openSelectPicker', field: FieldNode): void
  (e: 'openHistory', fieldKey: string): void
  (e: 'ensureHistory', fieldKey: string): void
}>()

const value = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const showHistoryTag = computed(() => {
  if (!isSuggestable(props.field)) return false
  const key = props.field.key
  const loading = props.historyLoading?.[key]
  const cached = props.historyCache?.[key]
  return !!loading || Array.isArray(cached)
})

const historyCount = computed(() => {
  const key = props.field.key
  const cached = props.historyCache?.[key]
  if (!Array.isArray(cached)) return 0
  return cached.length
})

function onHistoryClick() {
  emit('openHistory', props.field.key)
}

function onSuggestableFocus() {
  if (isSuggestable(props.field)) {
    emit('ensureHistory', props.field.key)
  }
}

const requiredRule = computed(() =>
  props.field.required ? [{ required: true, message: `请填写${props.field.label}` }] : []
)

const selectRequiredRule = computed(() =>
  props.field.required ? [{ required: true, message: `请选择${props.field.label}` }] : []
)
</script>

<template>

  <van-field
    v-if="field.type === 'text'"
    v-model="value"
    :label="field.label"
    :placeholder="'请输入' + field.label"
    :rules="requiredRule"
    clearable
    @focus="onSuggestableFocus"
  >
    <template #button>
      <van-tag
        v-if="showHistoryTag"
        size="medium"
        :color="historyLoading?.[field.key] ? '#f5f5f5' : '#ecf5ff'"
        :text-color="historyLoading?.[field.key] ? '#999' : '#409eff'"
        @click="onHistoryClick"
      >
        {{ historyLoading?.[field.key] ? '...' : (historyCount > 0 ? `常用 ${historyCount}` : '常用') }}
      </van-tag>
    </template>
  </van-field>

  <van-field
    v-else-if="field.type === 'textarea'"
    v-model="value"
    :label="field.label"
    type="textarea"
    rows="3"
    :placeholder="'请输入' + field.label"
    :rules="requiredRule"
    @focus="onSuggestableFocus"
  >
    <template #button>
      <van-tag
        v-if="showHistoryTag"
        size="medium"
        :color="historyLoading?.[field.key] ? '#f5f5f5' : '#ecf5ff'"
        :text-color="historyLoading?.[field.key] ? '#999' : '#409eff'"
        @click="onHistoryClick"
      >
        {{ historyLoading?.[field.key] ? '...' : (historyCount > 0 ? `常用 ${historyCount}` : '常用') }}
      </van-tag>
    </template>
  </van-field>

  <van-field
    v-else-if="field.type === 'number'"
    v-model="value"
    :label="field.label"
    type="number"
    :placeholder="'请输入' + field.label"
    :rules="requiredRule"
    @focus="onSuggestableFocus"
  >
    <template #button>
      <van-tag
        v-if="showHistoryTag"
        size="medium"
        :color="historyLoading?.[field.key] ? '#f5f5f5' : '#ecf5ff'"
        :text-color="historyLoading?.[field.key] ? '#999' : '#409eff'"
        @click="onHistoryClick"
      >
        {{ historyLoading?.[field.key] ? '...' : (historyCount > 0 ? `常用 ${historyCount}` : '常用') }}
      </van-tag>
    </template>
  </van-field>

  <van-field
    v-else-if="field.type === 'date'"
    :model-value="modelValue"
    :label="field.label"
    readonly
    :placeholder="'请选择日期'"
    is-link
    @click="emit('openDatePicker', field)"
  >
    <template #button>
      <van-tag
        v-if="showHistoryTag"
        size="medium"
        :color="historyLoading?.[field.key] ? '#f5f5f5' : '#ecf5ff'"
        :text-color="historyLoading?.[field.key] ? '#999' : '#409eff'"
        @click.stop="onHistoryClick"
      >
        {{ historyLoading?.[field.key] ? '...' : (historyCount > 0 ? `常用 ${historyCount}` : '常用') }}
      </van-tag>
    </template>
  </van-field>

  <van-field v-else-if="field.type === 'checkbox'">
    <template #input>
      <van-checkbox v-model="value" shape="square">
        {{ field.label }}
      </van-checkbox>
    </template>
  </van-field>

  <van-field v-else-if="field.type === 'radio'" :label="field.label">
    <template #input>
      <van-radio-group v-model="value" direction="vertical">
        <van-radio v-for="opt in (field.options || [])" :key="opt" :name="opt">{{ opt }}</van-radio>
      </van-radio-group>
    </template>
  </van-field>

  <van-field
    v-else-if="field.type === 'select'"
    :model-value="modelValue"
    :label="field.label"
    :rules="selectRequiredRule"
    readonly
    is-link
    :placeholder="'请选择'"
    @click="emit('openSelectPicker', field)"
  />

  <van-field v-else-if="field.type === 'image'" :label="field.label">
    <template #input>
      <div class="image-upload-area">
        <div v-if="modelValue" class="image-preview">
          <img :src="modelValue" alt="已上传图片" class="preview-img" />
          <van-icon name="clear" class="image-remove" @click="emit('update:modelValue', '')" />
        </div>
        <van-uploader v-else :after-read="(file: any) => emit('update:modelValue', file.content || '')" :max-count="1">
          <van-button size="small" icon="photograph" plain>上传图片</van-button>
        </van-uploader>
      </div>
    </template>
  </van-field>

  <van-field
    v-else-if="field.type === 'approval'"
    v-model="value"
    :label="field.label"
    type="textarea"
    rows="3"
    :placeholder="'请输入' + field.label"
    :rules="requiredRule"
    clearable
  />

  <van-cell v-else-if="field.type === 'signature'" :title="field.label" :label="field.description || '签名区域（签署时自动生成）'">
    <template #value>
      <span class="status-badge info">签署</span>
    </template>
  </van-cell>

  <van-field
    v-else
    v-model="value"
    :label="field.label"
    :placeholder="'请输入' + field.label"
    :rules="requiredRule"
    clearable
  />

  <van-cell v-if="field.description">
    <template #icon>
      <IconInfo :size="16" />
    </template>
    <template #label>
      <span class="field-desc">{{ field.description }}</span>
    </template>
  </van-cell>
</template>

<style scoped>
.field-desc {
  color: var(--srs-text-tertiary);
  font-size: 12px;
  line-height: 1.5;
}
.image-upload-area {
  width: 100%;
}
.image-preview {
  position: relative;
  display: inline-block;
}
.preview-img {
  max-width: 120px;
  max-height: 120px;
  border-radius: 6px;
  border: 1px solid var(--srs-border-light);
  object-fit: contain;
}
.image-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 18px;
  color: var(--srs-danger, #f56c6c);
  cursor: pointer;
  background: var(--srs-bg-card, #fff);
  border-radius: 50%;
}
</style>
