import type { Directive, DirectiveBinding } from 'vue'
import { watchEffect } from 'vue'
import { usePermissionStore } from '@/stores/permission'

export const vPermission: Directive<HTMLElement, string | string[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const store = usePermissionStore()

    const apply = () => {
      const codes = binding.value
      if (!codes) return

      const mode = binding.arg || 'any'
      const hasPerm = Array.isArray(codes)
        ? mode === 'all'
          ? store.hasAllPermissions(codes)
          : store.hasAnyPermission(codes)
        : store.hasPermission(codes)

      if (hasPerm) {
        if (el.style.display === 'none') {
          el.style.display = ''
        }
      } else {
        if (el.style.display !== 'none') {
          el.style.display = 'none'
        }
      }
    }

    const stop = watchEffect(() => {
      void store.permissions
      apply()
    })

    ;(el as any).__perm_stop = stop
  },
  unmounted(el: HTMLElement) {
    ;(el as any).__perm_stop?.()
    delete (el as any).__perm_stop
  },
}

export const vRole: Directive<HTMLElement, string | string[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const rolesStr = localStorage.getItem('roles')
    const userRoles: string[] = rolesStr ? JSON.parse(rolesStr) : []

    const requiredRoles = Array.isArray(binding.value) ? binding.value : [binding.value]
    const hasRole = requiredRoles.some(r => userRoles.includes(r))

    if (!hasRole) {
      el.parentNode?.removeChild(el)
    }
  },
}