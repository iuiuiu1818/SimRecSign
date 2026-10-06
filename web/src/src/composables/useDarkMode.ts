import { ref, onMounted } from 'vue'

const isDark = ref(false)
const STORAGE_KEY = 'srs-dark-mode'

export function useDarkMode() {
  function applyTheme(dark: boolean) {
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
    document.body.classList.toggle('dark', dark)
    localStorage.setItem(STORAGE_KEY, String(dark))
  }

  function toggle() {
    applyTheme(!isDark.value)
  }

  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      applyTheme(stored === 'true')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      applyTheme(prefersDark)
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(STORAGE_KEY) === null) {
        applyTheme(e.matches)
      }
    }
    mq.addEventListener('change', handler)
  })

  return { isDark, toggle }
}