import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import {
  DRAG_TYPE_MIME,
  isContainerOrGroupType,
  canBeChildOfContainer,
  typeDefOf,
  getDescendantFields,
  localPartOfKey,
  buildHierarchicalKey,
} from '../components/pdf-editor/fieldTypes'
import { round2, roundRect, toPDFRect, toCSSPixel } from '../components/pdf-editor/pdfCoords'
import type { Ref } from 'vue'

export interface FieldInteractionsContext {
  fields: Ref<any[]>
  currentPage: Ref<number>
  pageScale: Ref<number>
  canvasRef: Ref<HTMLCanvasElement | null>
  getRelativePos: (e: MouseEvent | DragEvent) => { x: number; y: number }
  onFieldsChange: (fields: any[]) => void
}

export function useFieldInteractions(ctx: FieldInteractionsContext) {
  const { fields, currentPage, pageScale, getRelativePos, onFieldsChange } = ctx

  const selectedFieldIndex = ref<number | null>(null)

  function selectField(index: number | null) {
    selectedFieldIndex.value = index
    if (index !== null) {
      const f = fields.value[index]
      const p = (f?.pageIndex ?? 0) + 1
      if (f && p !== currentPage.value) currentPage.value = p
    }
  }

  const armedType = ref<string | null>(null)

  function armType(type: string) {
    armedType.value = armedType.value === type ? null : type
    if (armedType.value) selectField(null)
  }

  function uniqueKey(prefix: string, parentKey?: string): string {
    const fullPrefix = parentKey ? `${parentKey}__${prefix}` : prefix
    const keys = new Set(fields.value.map(f => f.key))
    let i = 1
    while (keys.has(`${fullPrefix}${i}`)) i++
    return `${fullPrefix}${i}`
  }

  function findContainerAt(x: number, y: number): any | null {
    return fields.value.find(f =>
      isContainerOrGroupType(f.type) &&
      (f.pageIndex ?? 0) === currentPage.value - 1 &&
      f.rect &&
      x >= f.rect[0] && x <= f.rect[0] + f.rect[2] &&
      y >= f.rect[1] && y <= f.rect[1] + f.rect[3]
    ) || null
  }

  function createField(type: string, cssX: number, cssY: number, cssW?: number, cssH?: number) {
    const def = typeDefOf(type)
    const rect = toPDFRect(pageScale.value, cssX, cssY, cssW ?? def.defaultSize[0], cssH ?? def.defaultSize[1])

    const typeKey = type === 'container' ? 'container' : type === 'group' ? 'group' : 'field'
    let parentKey: string | undefined
    if (canBeChildOfContainer(type)) {
      const parent = findContainerAt(rect[0], rect[1])
      if (parent) {
        parentKey = parent.key
      } else if (selectedFieldIndex.value !== null) {
        const selected = fields.value[selectedFieldIndex.value]
        if (selected && isContainerOrGroupType(selected.type)) {
          parentKey = selected.key
        }
      }
    }

    const newField: any = {
      key: uniqueKey(typeKey, parentKey),
      label: `${def.label}${fields.value.filter(f => f.type === type).length + 1}`,
      type,
      required: false,
      pageIndex: currentPage.value - 1,
      rect,
      options: [],
      order: fields.value.length + 1,
    }
    if (type === 'signature') newField.signType = 'handwriting'
    if (parentKey) newField.groupKey = parentKey

    const updated = [...fields.value, newField]
    onFieldsChange(updated)
    selectField(updated.length - 1)
  }

  function handleDrop(e: DragEvent) {
    const type = e.dataTransfer?.getData(DRAG_TYPE_MIME)
    if (!type) return
    e.preventDefault()
    const pos = getRelativePos(e)
    createField(type, pos.x, pos.y)
  }

  const isDrawing = ref(false)
  const drawStart = ref({ x: 0, y: 0 })
  const drawRect = ref<{ x: number; y: number; w: number; h: number } | null>(null)

  function handleOverlayMouseDown(e: MouseEvent) {
    if (e.button !== 0) return
    if (!armedType.value) {
      selectField(null)
      return
    }
    const pos = getRelativePos(e)
    isDrawing.value = true
    drawStart.value = pos
    drawRect.value = { x: pos.x, y: pos.y, w: 0, h: 0 }
    document.addEventListener('mousemove', onDrawMove)
    document.addEventListener('mouseup', onDrawEnd)
  }

  function onDrawMove(e: MouseEvent) {
    if (!isDrawing.value) return
    const pos = getRelativePos(e)
    drawRect.value = {
      x: Math.min(drawStart.value.x, pos.x),
      y: Math.min(drawStart.value.y, pos.y),
      w: Math.abs(pos.x - drawStart.value.x),
      h: Math.abs(pos.y - drawStart.value.y),
    }
  }

  function onDrawEnd() {
    document.removeEventListener('mousemove', onDrawMove)
    document.removeEventListener('mouseup', onDrawEnd)
    if (!isDrawing.value) return
    isDrawing.value = false

    const type = armedType.value
    armedType.value = null
    const r = drawRect.value
    drawRect.value = null
    if (!type || !r) return

    if (r.w < 6 && r.h < 6) createField(type, r.x, r.y)
    else createField(type, r.x, r.y, r.w, r.h)
  }

  const isDragging = ref(false)
  const dragOffset = ref({ x: 0, y: 0 })

  function handleFieldMouseDown(e: MouseEvent, fieldIndex: number) {
    e.stopPropagation()
    if (e.button !== 0) return
    if (armedType.value) return
    if ((e.target as HTMLElement).closest('.resize-handle')) return

    const field = fields.value[fieldIndex]
    if (!field) return
    selectField(fieldIndex)

    const pos = getRelativePos(e)
    isDragging.value = true
    dragOffset.value = { x: pos.x - toCSSPixel(pageScale.value, field.rect[0]), y: pos.y - toCSSPixel(pageScale.value, field.rect[1]) }
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
  }

  function onDragMove(e: MouseEvent) {
    if (!isDragging.value || selectedFieldIndex.value === null) return
    const pos = getRelativePos(e)
    const updated = [...fields.value]
    const field = updated[selectedFieldIndex.value]

    const newX = round2(Math.max(0, (pos.x - dragOffset.value.x) / pageScale.value))
    const newY = round2(Math.max(0, (pos.y - dragOffset.value.y) / pageScale.value))
    const dx = newX - field.rect[0]
    const dy = newY - field.rect[1]

    updated[selectedFieldIndex.value] = {
      ...field,
      rect: [newX, newY, field.rect[2], field.rect[3]],
    }

    if (isContainerOrGroupType(field.type)) {
      const parentKey = field.key
      for (let i = 0; i < updated.length; i++) {
        if (i === selectedFieldIndex.value) continue
        const f = updated[i]
        if (f.groupKey === parentKey) {
          updated[i] = {
            ...f,
            rect: [round2(f.rect[0] + dx), round2(f.rect[1] + dy), f.rect[2], f.rect[3]],
          }
        }
      }
    }

    onFieldsChange(updated)
  }

  function onDragEnd() {
    isDragging.value = false
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
  }

  const isResizing = ref(false)
  const resizeHandle = ref('')
  const resizeStart = ref({ x: 0, y: 0, startX: 0, startY: 0, startW: 0, startH: 0 })

  let resizeRafId: number | null = null
  let resizePendingX = 0
  let resizePendingY = 0

  function handleResizeStart(e: MouseEvent, handle: string) {
    e.stopPropagation()
    e.preventDefault()
    if (selectedFieldIndex.value === null) return

    isResizing.value = true
    resizeHandle.value = handle
    const field = fields.value[selectedFieldIndex.value]
    resizeStart.value = {
      x: e.clientX,
      y: e.clientY,
      startX: field.rect[0],
      startY: field.rect[1],
      startW: field.rect[2],
      startH: field.rect[3],
    }
    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd)
  }

  function onResizeMove(e: MouseEvent) {
    if (!isResizing.value || selectedFieldIndex.value === null) return
    resizePendingX = e.clientX
    resizePendingY = e.clientY
    if (resizeRafId !== null) return
    resizeRafId = requestAnimationFrame(() => {
      resizeRafId = null
      performResize(resizePendingX, resizePendingY)
    })
  }

  function performResize(clientX: number, clientY: number) {
    if (!isResizing.value || selectedFieldIndex.value === null) return
    const dx = (clientX - resizeStart.value.x) / pageScale.value
    const dy = (clientY - resizeStart.value.y) / pageScale.value

    let { startX: newX, startY: newY, startW: newW, startH: newH } = resizeStart.value
    const handle = resizeHandle.value
    const minW = 40 / pageScale.value
    const minH = 24 / pageScale.value

    if (handle.includes('e')) newW = Math.max(minW, resizeStart.value.startW + dx)
    if (handle.includes('w')) {
      newW = Math.max(minW, resizeStart.value.startW - dx)
      newX = resizeStart.value.startX + (resizeStart.value.startW - newW)
    }
    if (handle.includes('s')) newH = Math.max(minH, resizeStart.value.startH + dy)
    if (handle.includes('n')) {
      newH = Math.max(minH, resizeStart.value.startH - dy)
      newY = resizeStart.value.startY + (resizeStart.value.startH - newH)
    }

    const updated = [...fields.value]
    updated[selectedFieldIndex.value] = {
      ...updated[selectedFieldIndex.value],
      rect: roundRect([newX, newY, newW, newH]),
    }
    onFieldsChange(updated)
  }

  function onResizeEnd() {
    isResizing.value = false
    if (resizeRafId !== null) {
      cancelAnimationFrame(resizeRafId)
      resizeRafId = null
    }
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
  }

  function copyGroup(index: number) {
    const target = fields.value[index]
    if (!target || (target.type !== 'group' && target.type !== 'container')) return

    const children = fields.value.filter(f => f.groupKey === target.key)
    const grandChildren = target.type === 'container'
      ? children.flatMap(c => fields.value.filter(f => f.groupKey === c.key))
      : []

    const groupH = target.rect[3]
    const offsetY = groupH + 12

    const keyMap = new Map<string, string>()

    const newGroupKey = uniqueKey(target.type === 'container' ? 'container' : 'group', target.groupKey)
    keyMap.set(target.key, newGroupKey)

    const newGroup = {
      ...target,
      key: newGroupKey,
      groupKey: target.groupKey,
      label: `${target.label} (副本)`,
      rect: roundRect([target.rect[0], target.rect[1] + offsetY, target.rect[2], target.rect[3]]),
      order: fields.value.length + 1,
    }

    const newChildren: any[] = []
    for (const child of children) {
      const newChildKey = uniqueKey(localPartOfKey(child.key), newGroupKey)
      keyMap.set(child.key, newChildKey)
      newChildren.push({
        ...child,
        key: newChildKey,
        groupKey: newGroupKey,
        label: child.label,
        rect: roundRect([child.rect[0], child.rect[1] + offsetY, child.rect[2], child.rect[3]]),
        order: fields.value.length + 1 + newChildren.length,
      })
    }

    const newGrandChildren: any[] = []
    for (const gc of grandChildren) {
      const newParentKey = keyMap.get(gc.groupKey) || newGroupKey
      const newGcKey = uniqueKey(localPartOfKey(gc.key), newParentKey)
      newGrandChildren.push({
        ...gc,
        key: newGcKey,
        groupKey: newParentKey,
        label: gc.label,
        rect: roundRect([gc.rect[0], gc.rect[1] + offsetY, gc.rect[2], gc.rect[3]]),
        order: fields.value.length + 1 + newChildren.length + newGrandChildren.length + 1,
      })
    }

    const updated = [...fields.value, newGroup, ...newChildren, ...newGrandChildren]
    onFieldsChange(updated)
    selectField(updated.length - 1 - newChildren.length - newGrandChildren.length)
  }

  function updateFieldProperty(key: string, value: any) {
    if (selectedFieldIndex.value === null) return
    const updated = [...fields.value]
    const oldField = updated[selectedFieldIndex.value]

    if (key === 'key' && isContainerOrGroupType(oldField.type)) {
      const oldKey = oldField.key
      const newKey = value
      if (oldKey === newKey) return
      updated[selectedFieldIndex.value] = { ...oldField, key: newKey }
      for (let i = 0; i < updated.length; i++) {
        if (i === selectedFieldIndex.value) continue
        const f = updated[i]
        if (f.groupKey === oldKey) {
          const local = localPartOfKey(f.key)
          updated[i] = {
            ...f,
            groupKey: newKey,
            key: buildHierarchicalKey(newKey, local),
          }
        }
      }
      onFieldsChange(updated)
      return
    }

    if (key === 'groupKey') {
      const newParentKey = value || ''
      const local = localPartOfKey(oldField.key)
      const newKey = buildHierarchicalKey(newParentKey || undefined, local)
      updated[selectedFieldIndex.value] = { ...oldField, groupKey: newParentKey, key: newKey }
      onFieldsChange(updated)
      return
    }

    updated[selectedFieldIndex.value] = { ...oldField, [key]: value }
    onFieldsChange(updated)
  }

  function deleteField(index: number) {
    const target = fields.value[index]
    if (!target) return

    if (isContainerOrGroupType(target.type)) {
      const descendants = getDescendantFields(fields.value, target.key)
      const msg = descendants.length > 0
        ? `确定删除「${target.label}」及其包含的 ${descendants.length} 个子元素？`
        : `确定删除「${target.label}」？`
      ElMessageBox.confirm(msg, '删除确认', {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        doDeleteField(index, target, descendants)
      }).catch(() => {})
      return
    }

    doDeleteField(index, target, [])
  }

  function doDeleteField(index: number, _target: any, descendants: any[]) {
    const descendantKeys = new Set(descendants.map(d => d.key))
    const updated = fields.value.filter((f, i) => {
      if (i === index) return false
      if (descendantKeys.has(f.key)) return false
      return true
    })

    onFieldsChange(updated)
    if (selectedFieldIndex.value === index) selectField(null)
    else if (selectedFieldIndex.value !== null && selectedFieldIndex.value > index) {
      selectedFieldIndex.value--
    }
  }

  function moveField(from: number, to: number) {
    if (from === to) return
    const arr = [...fields.value]
    const [moved] = arr.splice(from, 1)
    const insertAt = to > from ? to - 1 : to
    arr.splice(insertAt, 0, moved)
    onFieldsChange(arr.map((f, i) => ({ ...f, order: i + 1 })))

    if (selectedFieldIndex.value === from) selectedFieldIndex.value = insertAt
    else if (selectedFieldIndex.value !== null) {
      if (from < selectedFieldIndex.value && insertAt >= selectedFieldIndex.value) selectedFieldIndex.value--
      else if (from > selectedFieldIndex.value && insertAt <= selectedFieldIndex.value) selectedFieldIndex.value++
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return
    const t = e.target as HTMLElement
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    if (selectedFieldIndex.value === null) return
    e.preventDefault()
    deleteField(selectedFieldIndex.value)
  }

  onMounted(() => {
    document.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    if (resizeRafId !== null) {
      cancelAnimationFrame(resizeRafId)
      resizeRafId = null
    }
    document.removeEventListener('keydown', onKeydown)
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
    document.removeEventListener('mousemove', onDrawMove)
    document.removeEventListener('mouseup', onDrawEnd)
  })

  return {
    selectedFieldIndex,
    armedType,
    isDragging,
    isResizing,
    isDrawing,
    drawRect,
    selectField,
    armType,
    handleDrop,
    handleOverlayMouseDown,
    handleFieldMouseDown,
    handleResizeStart,
    copyGroup,
    updateFieldProperty,
    deleteField,
    moveField,
  }
}