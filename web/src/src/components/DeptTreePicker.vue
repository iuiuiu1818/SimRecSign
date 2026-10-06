<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { directoryAPI } from '@/api'

interface DeptUser {
  id: string
  name: string
  departmentId?: string
}

interface DeptNode {
  id: string
  name: string
  parentId?: string
  sortOrder: number
  children: DeptNode[]
  users: DeptUser[]
}

interface TreeNode {
  id: string
  label: string
  type: 'dept' | 'user'
  deptId?: string
  isLeaf: boolean
  children?: TreeNode[]
}

const props = withDefaults(defineProps<{
  modelValue?: string | string[] | null
  multiple?: boolean
  mode?: 'user' | 'dept'
  placeholder?: string
}>(), {
  modelValue: null,
  multiple: false,
  mode: 'user',
  placeholder: '请选择',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | null]
}>()

const treeData = ref<TreeNode[]>([])
const loading = ref(false)
const filterText = ref('')

function buildTree(nodes: DeptNode[]): TreeNode[] {
  return nodes.map(n => {
    const deptNode: TreeNode = {
      id: n.id,
      label: n.name,
      type: 'dept',
      isLeaf: false,
      children: [],
    }
    if (props.mode === 'user' && n.users?.length > 0) {
      deptNode.children = n.users.map(u => ({
        id: u.id,
        label: u.name,
        type: 'user' as const,
        deptId: n.id,
        isLeaf: true,
      }))
    }
    if (n.children?.length > 0) {
      const subDepts = buildTree(n.children)
      if (props.mode === 'dept') {
        deptNode.children = [...(deptNode.children || []), ...subDepts]
      } else {
        deptNode.children = [...(deptNode.children || []), ...subDepts]
      }
    }
    if (props.mode === 'dept') {
      deptNode.isLeaf = deptNode.children?.length === 0
    }
    return deptNode
  })
}

onMounted(async () => {
  loading.value = true
  try {
    const res: any = await directoryAPI.tree()
    const raw = res.data?.data || res.data || []
    treeData.value = buildTree(raw)
  } catch {
    treeData.value = []
  } finally {
    loading.value = false
  }
})

const filteredTreeData = computed(() => {
  if (!filterText.value) return treeData.value
  return filterNode(treeData.value, filterText.value.toLowerCase())
})

function filterNode(nodes: TreeNode[], keyword: string): TreeNode[] {
  return nodes.reduce<TreeNode[]>((acc, node) => {
    const matched = node.label.toLowerCase().includes(keyword)
    const filteredChildren = node.children ? filterNode(node.children, keyword) : []
    if (matched || filteredChildren.length > 0) {
      acc.push({ ...node, children: filteredChildren })
    }
    return acc
  }, [])
}

const currentValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

function handleNodeClick(node: TreeNode) {
  if (props.multiple) {
    return
  }
  if (node.isLeaf || props.mode === 'dept') {
    currentValue.value = node.id
  }
}

const selectedLabel = computed(() => {
  const val = props.modelValue
  if (!val) return ''
  if (props.multiple && Array.isArray(val)) {
    if (val.length === 0) return ''
    return `已选 ${val.length} 项`
  }
  const id = val as string
  const found = findNodeById(treeData.value, id)
  return found ? found.label : id
})

function findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const found = findNodeById(n.children, id)
      if (found) return found
    }
  }
  return null
}
</script>

<template>
  <div class="dept-tree-picker">
    <el-input
      v-model="filterText"
      placeholder="搜索部门或人员..."
      clearable
      size="small"
      class="filter-input"
    />
    <el-tree
      :data="filteredTreeData"
      :props="{ label: 'label', children: 'children', disabled: 'disabled' }"
      :node-key="'id'"
      :highlight-current="!multiple"
      :show-checkbox="multiple"
      :check-strictly="false"
      :default-expand-all="false"
      :expand-on-click-node="multiple"
      @node-click="handleNodeClick"
      v-bind="$attrs"
      class="picker-tree"
      empty-text="暂无数据"
    >
      <template #default="{ data }">
        <span class="tree-node" :class="{ 'tree-node-user': data.type === 'user', 'tree-node-dept': data.type === 'dept' }">
          <span class="tree-node-icon">
            <template v-if="data.type === 'dept'">📁</template>
            <template v-else>👤</template>
          </span>
          <span class="tree-node-label">{{ data.label }}</span>
          <span v-if="data.type === 'user'" class="tree-node-dept-tag">{{ data.deptId ? '' : '无部门' }}</span>
        </span>
      </template>
    </el-tree>
    <div v-if="selectedLabel" class="selected-info">
      <el-tag size="small" type="info" closable @close="currentValue = multiple ? [] : null">
        {{ selectedLabel }}
      </el-tag>
    </div>
  </div>
</template>

<style scoped>
.dept-tree-picker {
  border: 1px solid var(--srs-border, #dcdfe6);
  border-radius: 6px;
  padding: 8px;
  max-height: 360px;
  display: flex;
  flex-direction: column;
}

.filter-input {
  margin-bottom: 8px;
}

.picker-tree {
  flex: 1;
  overflow-y: auto;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.tree-node-user .tree-node-label {
  color: var(--srs-text-primary, #303133);
}

.tree-node-dept .tree-node-label {
  font-weight: 600;
  color: var(--srs-text-primary, #303133);
}

.tree-node-icon {
  font-size: 14px;
  line-height: 1;
}

.tree-node-dept-tag {
  font-size: 11px;
  color: var(--srs-text-tertiary, #909399);
  margin-left: 4px;
}

.selected-info {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--srs-border-light, #ebeef5);
}
</style>