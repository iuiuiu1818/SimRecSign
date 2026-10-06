import { ref } from 'vue'
import { documentAPI } from '@/api'

export interface HistoryCandidate {
  value: string | number
  lastUsed: string
  useCount: number
}

const SUGGESTABLE = ['text', 'textarea', 'number', 'date']
export function isSuggestable(field: { type: string } | null | undefined): boolean {
  return !!field && SUGGESTABLE.includes(field.type)
}

export function useFieldHistory(docId?: string) {
  const cache = ref<Record<string, HistoryCandidate[]>>({})
  const loading = ref<Record<string, boolean>>({})

  function ensure(fieldKey: string): void {
    if (!docId) return
    if (cache.value[fieldKey] || loading.value[fieldKey]) return
    loading.value[fieldKey] = true
    documentAPI
      .fieldHistory(docId, fieldKey)
      .then((res: any) => {
        const raw = res?.candidates || res?.data?.candidates || res?.data?.data?.candidates || []
        cache.value[fieldKey] = Array.isArray(raw) ? raw : []
      })
      .catch(() => {
        cache.value[fieldKey] = []
      })
      .finally(() => {
        loading.value[fieldKey] = false
      })
  }

  function candidatesFor(fieldKey: string, query: unknown, excludeCurrent = true): HistoryCandidate[] {
    const list = cache.value[fieldKey] || []
    if (list.length === 0) return []
    if (!excludeCurrent) return list
    const q = String(query ?? '').trim().toLowerCase()
    const cur = String(query ?? '')
    return list.filter((c) => {
      const text = String(c.value).toLowerCase()
      const match = q === '' || text.includes(q)
      return match && String(c.value) !== cur
    })
  }

  return { ensure, candidatesFor, cache, loading }
}
