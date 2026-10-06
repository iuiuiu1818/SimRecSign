
export interface FieldNode {
  key: string
  label: string
  type: string
}

export interface StepFieldBlock {
  key: string
  label: string
  type: 'container' | 'group' | 'free'
  fields: FieldNode[]
  children: StepFieldBlock[]
}

export function buildStepFieldBlocks(fields: any[]): StepFieldBlock[] {
  const containers: any[] = []
  const groups: any[] = []
  const leaves: any[] = []

  for (const f of fields) {
    if (f.type === 'container') {
      containers.push(f)
    } else if (f.type === 'group') {
      groups.push(f)
    } else {
      leaves.push(f)
    }
  }

  const containerToGroups = new Map<string, any[]>()
  const parentToFields = new Map<string, FieldNode[]>()

  for (const g of groups) {
    if (g.groupKey) {
      const parent = containers.find(c => c.key === g.groupKey)
      if (parent) {
        if (!containerToGroups.has(parent.key)) {
          containerToGroups.set(parent.key, [])
        }
        containerToGroups.get(parent.key)!.push(g)
        continue
      }
    }
  }

  const freeLeaves: FieldNode[] = []
  for (const leaf of leaves) {
    const node: FieldNode = { key: leaf.key, label: leaf.label, type: leaf.type }
    const parentKey = leaf.groupKey
    if (parentKey) {
      let parent = groups.find(g => g.key === parentKey)
      if (!parent) {
        parent = containers.find(c => c.key === parentKey)
      }
      if (parent) {
        if (!parentToFields.has(parent.key)) {
          parentToFields.set(parent.key, [])
        }
        parentToFields.get(parent.key)!.push(node)
        continue
      }
    }
    freeLeaves.push(node)
  }

  const containerBlocks: StepFieldBlock[] = containers.map(c => ({
    key: c.key,
    label: c.label || c.key,
    type: 'container',
    fields: parentToFields.get(c.key) || [],
    children: (containerToGroups.get(c.key) || []).map(g => ({
      key: g.key,
      label: g.label || g.key,
      type: 'group',
      fields: parentToFields.get(g.key) || [],
      children: [],
    })),
  }))

  const topLevelGroupKeys = new Set(
    groups.filter(g => !g.groupKey || !containers.find(c => c.key === g.groupKey)).map(g => g.key)
  )
  const groupBlocks: StepFieldBlock[] = groups
    .filter(g => topLevelGroupKeys.has(g.key))
    .map(g => ({
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

  const nonEmpty = (b: StepFieldBlock) =>
    b.fields.length > 0 || b.children.some(c => c.fields.length > 0)

  const blocks = [...containerBlocks, ...groupBlocks].filter(nonEmpty)
  if (freeLeaves.length > 0) blocks.push(freeBlock)
  return blocks
}

export function collectBlockFieldKeys(block: StepFieldBlock): string[] {
  const keys = block.fields.map(f => f.key)
  for (const child of block.children) {
    keys.push(...collectBlockFieldKeys(child))
  }
  return keys
}