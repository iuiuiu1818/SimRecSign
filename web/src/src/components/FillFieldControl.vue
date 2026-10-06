<script setup lang="ts">
import { computed } from 'vue'
import { EditPen, InfoFilled } from '@element-plus/icons-vue'
import FieldHistorySuggest from './FieldHistorySuggest.vue'
import { isSuggestable } from '@/composables/useFieldHistory'
import type { HistoryCandidate } from '@/composables/useFieldHistory'

const props = defineProps<{
  field: any
  modelValue: any
  candidates?: HistoryCandidate[]
  onFieldFocus?: () => void
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()

const suggestable = computed(() => isSuggestable(props.field))
const value = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function onPick(v: string | number) {
  emit('update:modelValue', v)
}

const listedCandidates = computed(() => (suggestable.value ? props.candidates || [] : []))

function onImageFileChange(file: any) {
  if (file?.raw) value.value = URL.createObjectURL(file.raw)
}
</script>

<template>
  <div class="field-control-wrap">

    <FieldHistorySuggest
      v-if="suggestable"
      :field-type="field.type"
      :model-value="modelValue"
      :candidates="listedCandidates"
      @focus="onFieldFocus"
      @pick="onPick"
    >
      <el-input
        v-if="field.type === 'text'"
        :model-value="modelValue"
        :placeholder="'请输入' + field.label"
        clearable
        @update:model-value="value = $event"
      />
      <el-input
        v-else-if="field.type === 'textarea'"
        :model-value="modelValue"
        type="textarea"
        :rows="4"
        :placeholder="'请输入' + field.label"
        @update:model-value="value = $event"
      />
      <el-input-number
        v-else-if="field.type === 'number'"
        :model-value="modelValue"
        :min="field.minVal ?? 0"
        :max="field.maxVal ?? undefined"
        style="width: 100%"
        @update:model-value="value = $event"
      />
      <el-date-picker
        v-else-if="field.type === 'date'"
        :model-value="modelValue"
        type="date"
        placeholder="选择日期"
        style="width: 100%"
        value-format="YYYY-MM-DD"
        @update:model-value="value = $event"
      />
    </FieldHistorySuggest>

    <template v-else>
      <el-input
        v-if="field.type === 'text'"
        v-model="value"
        :placeholder="'请输入' + field.label"
        clearable
      />
      <el-input
        v-else-if="field.type === 'textarea'"
        v-model="value"
        type="textarea"
        :rows="4"
        :placeholder="'请输入' + field.label"
      />
      <el-input-number
        v-else-if="field.type === 'number'"
        v-model="value"
        :min="field.minVal ?? 0"
        :max="field.maxVal ?? undefined"
        style="width: 100%"
      />
      <el-date-picker
        v-else-if="field.type === 'date'"
        v-model="value"
        type="date"
        placeholder="选择日期"
        style="width: 100%"
        value-format="YYYY-MM-DD"
      />
      <el-input
        v-else-if="field.type === 'approval'"
        v-model="value"
        type="textarea"
        :rows="3"
        :placeholder="'请输入' + field.label"
      />
      <el-checkbox v-else-if="field.type === 'checkbox'" v-model="value">
        {{ field.label }}
      </el-checkbox>
      <el-radio-group v-else-if="field.type === 'radio'" v-model="value">
        <el-radio v-for="opt in (field.options || [])" :key="opt" :value="opt">
          {{ opt }}
        </el-radio>
      </el-radio-group>
      <el-select
        v-else-if="field.type === 'select'"
        v-model="value"
        placeholder="请选择"
        style="width: 100%"
        clearable
      >
        <el-option v-for="opt in (field.options || [])" :key="opt" :label="opt" :value="opt" />
      </el-select>
      <div v-else-if="field.type === 'signature'" class="signature-field-placeholder">
        <el-icon :size="20" style="color: #409EFF; margin-right: 6px; vertical-align: middle;"><EditPen /></el-icon>
        <span>签名区域（签署时自动生成）</span>
      </div>
      <el-upload
        v-else-if="field.type === 'image'"
        :auto-upload="false"
        :show-file-list="false"
        accept="image/*"
        :on-change="onImageFileChange"
      >
        <div v-if="modelValue" class="image-preview-wrap">
          <img :src="modelValue" class="image-preview-img" alt="" />
          <el-button size="small" text type="danger" @click.stop="value = ''">删除</el-button>
        </div>
        <el-button v-else size="small" plain>上传图片</el-button>
      </el-upload>
      <el-input
        v-else
        v-model="value"
        :placeholder="'请输入' + field.label"
        clearable
      />
    </template>

    <div v-if="field.description" class="field-desc">
      <el-icon :size="13" style="vertical-align: -2px;"><InfoFilled /></el-icon>
      <span>{{ field.description }}</span>
    </div>
  </div>
</template>

<style scoped>
.field-control-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}
.field-desc {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--srs-text-tertiary, #909399);
  line-height: 1.4;
  padding: 2px 0;
}
.signature-field-placeholder {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--srs-primary-bg);
  border: 1px dashed var(--srs-primary);
  border-radius: 8px;
  color: var(--srs-primary);
  font-size: 14px;
}
.image-preview-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.image-preview-img {
  max-width: 200px;
  max-height: 100px;
  border-radius: 6px;
  border: 1px solid var(--srs-border-light);
  object-fit: contain;
}
</style>