
export function statusLabel(s: string): string {
  const m: Record<string, string> = {
    draft: '草稿',
    in_progress: '进行中',
    completed: '已完成',
    terminated: '已终止',
    withdrawn: '已撤回',
  }
  return m[s] || s
}

export function statusBadge(s: string): string {
  if (s === 'in_progress') return 'warning'
  if (s === 'completed') return 'success'
  if (s === 'terminated' || s === 'withdrawn') return 'danger'
  return 'info'
}

export function stepStatusText(s: string): string {
  const m: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    returned: '已退回',
  }
  return m[s] || s
}

export function formatDate(ms: number, locale = 'zh-CN'): string {
  if (!ms) return '-'
  return new Date(ms).toLocaleString(locale)
}
