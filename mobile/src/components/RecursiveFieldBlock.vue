<script setup lang="ts">
import type { StepFieldBlock } from '@/utils/fieldBlocks'
import { isBlockCollapsible } from '@/utils/fieldBlocks'
import FieldBlockHeader from '@/components/FieldBlockHeader.vue'
import FillFieldControl from '@/components/FillFieldControl.vue'
import ReadOnlyFieldCell from '@/components/ReadOnlyFieldCell.vue'

const props = withDefaults(defineProps<{
  block: StepFieldBlock
  mode: 'editable' | 'readonly' | 'detail'
  collapsePath?: string
  collapsedKeys?: Set<string>
  fieldValues?: Record<string, any>
  historyCache?: Record<string, any>
  historyLoading?: Record<string, boolean>
  showSignedBadge?: boolean
}>(), {
  collapsePath: '',
  collapsedKeys: () => new Set(),
  fieldValues: () => ({}),
  historyCache: () => ({}),
  historyLoading: () => ({}),
  showSignedBadge: true,
})

const emit = defineEmits<{
  (e: 'toggleCollapse', key: string): void
  (e: 'updateFieldValue', key: string, value: any): void
  (e: 'openDatePicker', field: any): void
  (e: 'openSelectPicker', field: any): void
  (e: 'openHistory', fieldKey: string): void
  (e: 'ensureHistory', fieldKey: string): void
}>()

const fullKey = (path: string, block: StepFieldBlock) => path + block.key

const childPath = (path: string, block: StepFieldBlock) => fullKey(path, block) + '/'

function blockFieldCount(block: StepFieldBlock): number {
  let n = block.fields.length
  for (const c of block.children) n += blockFieldCount(c)
  return n
}

function blockTypeClass(type: string) {
  return type === 'container' ? 'is-container' : type === 'group' ? 'is-group' : 'is-free'
}

function onToggle(key: string) { emit('toggleCollapse', key) }
function onFieldUpdate(key: string, val: any) { emit('updateFieldValue', key, val) }
</script>

<template>

  <div v-if="mode === 'editable'" :class="['fill-block', blockTypeClass(block.type)]">
    <FieldBlockHeader
      :block="block"
      :collapsed="collapsedKeys.has(fullKey(collapsePath, block))"
      :collapsible="isBlockCollapsible(block)"
      mode="editable"
      :field-count="blockFieldCount(block)"
      @toggle="onToggle(fullKey(collapsePath, block))"
    />
    <van-cell-group inset v-show="!collapsedKeys.has(fullKey(collapsePath, block))">
      <FillFieldControl
        v-for="field in block.fields"
        :key="field.key"
        :field="field"
        :model-value="fieldValues[field.key]"
        :history-cache="historyCache"
        :history-loading="historyLoading"
        @update:model-value="onFieldUpdate(field.key, $event)"
        @open-date-picker="emit('openDatePicker', $event)"
        @open-select-picker="emit('openSelectPicker', $event)"
        @open-history="emit('openHistory', $event)"
        @ensure-history="emit('ensureHistory', $event)"
      />

      <div v-for="child in block.children" :key="child.key" class="block-nested-inner">
        <RecursiveFieldBlock
          :block="child"
          mode="editable"
          :collapse-path="childPath(collapsePath, block)"
          :collapsed-keys="collapsedKeys"
          :field-values="fieldValues"
          :history-cache="historyCache"
          :history-loading="historyLoading"
          @toggle-collapse="onToggle"
          @update-field-value="onFieldUpdate"
          @open-date-picker="emit('openDatePicker', $event)"
          @open-select-picker="emit('openSelectPicker', $event)"
          @open-history="emit('openHistory', $event)"
          @ensure-history="emit('ensureHistory', $event)"
        />
      </div>
    </van-cell-group>
  </div>

  <div v-else-if="mode === 'readonly'" :class="['ro-block', blockTypeClass(block.type)]">
    <FieldBlockHeader
      :block="block"
      :collapsed="collapsedKeys.has(fullKey(collapsePath, block))"
      :collapsible="isBlockCollapsible(block)"
      mode="readonly"
      :field-count="blockFieldCount(block)"
      @toggle="onToggle(fullKey(collapsePath, block))"
    />
    <div v-show="!collapsedKeys.has(fullKey(collapsePath, block))" class="ro-block-body">
      <van-cell-group inset>
        <ReadOnlyFieldCell
          v-for="field in block.fields"
          :key="field.key"
          :field="field"
          :value="fieldValues[field.key]"
          :show-signed-badge="showSignedBadge"
        />
      </van-cell-group>

      <RecursiveFieldBlock
        v-for="child in block.children"
        :key="child.key"
        :block="child"
        mode="readonly"
        :collapse-path="childPath(collapsePath, block)"
        :collapsed-keys="collapsedKeys"
        :field-values="fieldValues"
        :show-signed-badge="showSignedBadge"
        @toggle-collapse="onToggle"
      />
    </div>
  </div>

  <div v-else class="detail-block">
    <FieldBlockHeader :block="block" mode="detail" />
    <van-cell-group :border="false">

      <ReadOnlyFieldCell
        v-for="field in block.fields"
        :key="field.key"
        :field="field"
        :value="field.value"
        :show-signed-badge="showSignedBadge"
      />
    </van-cell-group>

    <div v-for="child in block.children" :key="child.key" class="detail-nested">
      <RecursiveFieldBlock
        :block="child"
        mode="detail"
        :show-signed-badge="showSignedBadge"
      />
    </div>
  </div>
</template>

<style scoped>

.fill-block { margin-bottom: 12px; }
.fill-block.is-container,
.fill-block.is-group {
  border: 1px solid var(--dc-block-border);
  border-left: 3px solid var(--dc-block-accent);
  border-radius: 10px;
  background: var(--dc-block-bg);
  margin: 0 6px 12px;
}
.fill-block.is-container {
  --dc-block-border: var(--dc-container-border);
  --dc-block-accent: var(--dc-container-accent);
  --dc-block-bg: var(--dc-container-bg);
}
.fill-block.is-group {
  --dc-block-border: var(--dc-group-border);
  --dc-block-accent: var(--dc-group-accent);
  --dc-block-bg: var(--dc-group-bg);
  border-style: dashed;
}
.fill-block.is-free { margin: 0 2px 6px; }

.block-nested-inner { margin: 4px 0 8px; }

.ro-block { margin: 0 6px 12px; }
.ro-block.is-container,
.ro-block.is-group {
  border: 1px solid var(--dc-block-border);
  border-left: 3px solid var(--dc-block-accent);
  border-radius: 10px;
  background: var(--dc-block-bg);
}
.ro-block.is-container {
  --dc-block-border: var(--dc-container-border);
  --dc-block-accent: var(--dc-container-accent);
  --dc-block-bg: var(--dc-container-bg);
}
.ro-block.is-group {
  --dc-block-border: var(--dc-group-border);
  --dc-block-accent: var(--dc-group-accent);
  --dc-block-bg: var(--dc-group-bg);
  border-style: dashed;
}
.ro-block.is-free { margin: 0 2px 6px; }
.ro-block-body { padding: 0 0 6px; }

.detail-block { margin-bottom: 16px; }
.detail-nested { margin-left: 10px; border-left: 2px solid var(--srs-border-light); padding-left: 10px; }
</style>
