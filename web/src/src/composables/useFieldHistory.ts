import { reactive } from 'vue'
import { documentAPI } from '@/api'

export interface HistoryCandidate {
  value: string | number
  lastUsed: string
  useCount: number
}

const ELIGIBLE_TYPES = ['text', 'textarea', 'number', 'date']

export function isSuggestable(field: { type: string } | null | undefined): boolean {
  return !!field && ELIGIBLE_TYPES.includes(field.type)
}

export function useFieldHistory(docId: string) {
  const cache = reactive<Record<string, HistoryCandidate[]>>({})
  const loading = reactive<Record<string, boolean>>({})
  const inflight = new Map<string, Promise<void>>()

  function ensure(fieldKey: string): void {
    if (cache[fieldKey] || loading[fieldKey] || inflight.has(fieldKey)) return

    loading[fieldKey] = true
    const p = documentAPI
      .fieldHistory(docId, fieldKey)
      .then((res: any) => {
        const candidates = res?.candidates || res?.data?.candidates || []
        cache[fieldKey] = Array.isArray(candidates) ? candidates : []
      })
      .catch(() => {
        cache[fieldKey] = []
      })
      .finally(() => {
        loading[fieldKey] = false
        inflight.delete(fieldKey)
      })
    inflight.set(fieldKey, p)
  }

  function candidatesFor(fieldKey: string, query: unknown, excludeCurrent = true): HistoryCandidate[] {
    const list = cache[fieldKey] || []
    if (list.length === 0) return list
    if (!excludeCurrent) return list
    const q = String(query ?? '').trim().toLowerCase()
    const cur = String(query ?? '')
    return list.filter((c) => {
      const text = String(c.value).toLowerCase()
      const match = q === '' || text.includes(q)
      return match && String(c.value) !== cur
    })
  }

  function hasCandidates(fieldKey: string): boolean {
    return (cache[fieldKey] || []).length > 0
  }

  return { ensure, candidatesFor, hasCandidates, loading, cache }
}