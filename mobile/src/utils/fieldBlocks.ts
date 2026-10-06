
export interface FieldNode {
  key: string
  label: string
  type: string
  required?: boolean
  minVal?: number | null
  maxVal?: number | null
  options?: string[]
  signature?: unknown
  description?: string
  value?: string
}

export interface StepFieldBlock {
  key: string
  label: string
  type: 'container' | 'group' | 'free'
  fields: FieldNode[]
  children: StepFieldBlock[]
}

export function isBlockCollapsible(block: StepFieldBlock): boolean {
  return block.type === 'container' || block.type === 'group'
}

export function buildStepFieldBlocks(fields: any[]): StepFieldBlock[] {
  const containers: any[] = []
  const groups: any[] = []
  const leaves: any[] = []

  const fieldOrderMap = new Map<string, number>()
  fields.forEach((f, i) => {
    const ord = typeof f.order === 'number' ? f.order : i
    fieldOrderMap.set(f.key, ord)
  })

  for (const f of fields) {
    if (f.type === 'container') containers.push(f)
    else if (f.type === 'group') groups.push(f)
    else leaves.push(f)
  }

  const sortByOrder = (arr: any[]) => arr.sort((a, b) => (fieldOrderMap.get(a.key) ?? Infinity) - (fieldOrderMap.get(b.key) ?? Infinity))
  sortByOrder(containers)
  sortByOrder(groups)

  const containerToGroups = new Map<string, any[]>()
  const parentToFields = new Map<string, FieldNode[]>()

  for (const g of groups) {
    if (g.groupKey) {
      const parent = containers.find((c) => c.key === g.groupKey)
      if (parent) {
        if (!containerToGroups.has(parent.key)) containerToGroups.set(parent.key, [])
        containerToGroups.get(parent.key)!.push(g)
        continue
      }
    }
  }

  const freeLeaves: FieldNode[] = []
  for (const leaf of leaves) {
    const node: FieldNode = {
      key: leaf.key,
      label: leaf.label,
      type: leaf.type,
      required: leaf.required,
      minVal: leaf.minVal,
      maxVal: leaf.maxVal,
      options: leaf.options,
      signature: leaf.signType,
      description: leaf.description,
      value: leaf.value,
    }
    const parentKey = leaf.groupKey
    if (parentKey) {
      let parent = groups.find((g) => g.key === parentKey)
      if (!parent) parent = containers.find((c) => c.key === parentKey)
      if (parent) {
        if (!parentToFields.has(parent.key)) parentToFields.set(parent.key, [])
        parentToFields.get(parent.key)!.push(node)
        continue
      }
    }
    freeLeaves.push(node)
  }

  for (const arr of parentToFields.values()) {
    arr.sort((a, b) => (fieldOrderMap.get(a.key) ?? Infinity) - (fieldOrderMap.get(b.key) ?? Infinity))
  }
  freeLeaves.sort((a, b) => (fieldOrderMap.get(a.key) ?? Infinity) - (fieldOrderMap.get(b.key) ?? Infinity))

  const toNode = (f: any): FieldNode => ({ key: f.key, label: f.label, type: f.type })

  const containerBlocks: StepFieldBlock[] = containers.map((c) => ({
    key: c.key,
    label: c.label || c.key,
    type: 'container',
    fields: parentToFields.get(c.key) || [],
    children: (containerToGroups.get(c.key) || []).map((g) => ({
      key: g.key,
      label: g.label || g.key,
      type: 'group',
      fields: parentToFields.get(g.key) || [],
      children: [],
    })),
  }))

  for (const cb of containerBlocks) {
    cb.children.sort((a, b) => (fieldOrderMap.get(a.key) ?? Infinity) - (fieldOrderMap.get(b.key) ?? Infinity))
  }

  const topLevelGroupKeys = new Set(
    groups.filter((g) => !g.groupKey || !containers.find((c) => c.key === g.groupKey)).map((g) => g.key),
  )
  const groupBlocks: StepFieldBlock[] = groups
    .filter((g) => topLevelGroupKeys.has(g.key))
    .map((g) => ({
      key: g.key,
      label: g.label || g.key,
      type: 'group',
      fields: parentToFields.get(g.key) || [],
      children: [],
    }))

  const freeBlock: StepFieldBlock = {
    key: '',
    label: '独立字段',
    type: 'free',
    fields: freeLeaves,
    children: [],
  }

  const nonEmpty = (b: StepFieldBlock) => b.fields.length > 0 || b.children.some((c) => c.fields.length > 0)
  let blocks = [...containerBlocks, ...groupBlocks].filter(nonEmpty)
  blocks.sort((a, b) => (fieldOrderMap.get(a.key) ?? Infinity) - (fieldOrderMap.get(b.key) ?? Infinity))
  if (freeLeaves.length > 0) blocks.push(freeBlock)
  return blocks
}

export function collectBlockFieldKeys(block: StepFieldBlock): string[] {
  const keys = block.fields.map((f) => f.key)
  for (const child of block.children) keys.push(...collectBlockFieldKeys(child))
  return keys
}

export function isImageFieldType(type: string): boolean {
  return type === 'signature' || type === 'image'
}

export function isImageValue(val: unknown): val is string {
  if (typeof val !== 'string' || val === '') return false
  return (
    val.startsWith('data:image') ||
    /^https?:\/\//i.test(val) ||
    val.startsWith('./') ||
    val.startsWith('../')
  )
}