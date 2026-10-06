
export interface FieldTypeDef {
  value: string
  label: string
  icon: string
  color: string
  defaultSize: [number, number]
}

export const CONTAINER_TYPES: FieldTypeDef[] = [
  { value: 'group', label: '字段分组', icon: 'Collection', color: '#fa8c16', defaultSize: [240, 150] },
  { value: 'container', label: '行容器', icon: 'Grid', color: '#13c2c2', defaultSize: [300, 200] },
]

export const FIELD_TYPES: FieldTypeDef[] = [
  { value: 'text', label: '单行文本', icon: 'EditPen', color: '#409eff', defaultSize: [120, 26] },
  { value: 'textarea', label: '多行文本', icon: 'Document', color: '#626aef', defaultSize: [180, 50] },
  { value: 'number', label: '数字', icon: 'Odometer', color: '#e6a23c', defaultSize: [100, 26] },
  { value: 'date', label: '日期', icon: 'Calendar', color: '#67c23a', defaultSize: [120, 26] },
  { value: 'checkbox', label: '勾选框', icon: 'Finished', color: '#f56c6c', defaultSize: [20, 20] },
  { value: 'radio', label: '单选', icon: 'CircleCheck', color: '#b15dff', defaultSize: [120, 26] },
  { value: 'select', label: '下拉', icon: 'ArrowDown', color: '#0e9f6e', defaultSize: [120, 26] },
  { value: 'image', label: '图片上传', icon: 'Picture', color: '#2f54eb', defaultSize: [120, 75] },
  { value: 'signature', label: '签名', icon: 'Stamp', color: '#722ed1', defaultSize: [140, 40] },
  { value: 'approval', label: '审批意见', icon: 'ChatLineSquare', color: '#64748b', defaultSize: [200, 48] },
]

export const ALL_TYPES: FieldTypeDef[] = [...CONTAINER_TYPES, ...FIELD_TYPES]

const containerTypeSet = new Set(CONTAINER_TYPES.map(t => t.value))

export function isContainerType(type: string): boolean {
  return containerTypeSet.has(type)
}

export function typeDefOf(type: string): FieldTypeDef {
  return ALL_TYPES.find(t => t.value === type) || FIELD_TYPES[0]
}

export const DRAG_TYPE_MIME = 'application/x-srs-field-type'

export function isContainerOrGroupType(type: string): boolean {
  return isContainerType(type) || type === 'group'
}

export function getChildFields(fields: any[], parentKey: string): any[] {
  return fields.filter(f => f.groupKey === parentKey)
}

export function getDescendantFields(fields: any[], parentKey: string): any[] {
  const result: any[] = []
  const direct = getChildFields(fields, parentKey)
  for (const child of direct) {
    result.push(child)
    if (isContainerOrGroupType(child.type)) {
      result.push(...getDescendantFields(fields, child.key))
    }
  }
  return result
}

export function canBeChildOfContainer(type: string): boolean {
  return type !== 'container'
}

export function localPartOfKey(key: string): string {
  const idx = key.lastIndexOf('__')
  return idx >= 0 ? key.slice(idx + 2) : key
}

export function buildHierarchicalKey(parentKey: string | undefined, localKey: string): string {
  return parentKey ? `${parentKey}__${localKey}` : localKey
}
