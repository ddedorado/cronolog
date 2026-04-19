import { useDark, useToggle } from '@vueuse/core'

export function useTheme() {
  const isDark = useDark({ attribute: 'class', valueDark: 'dark', valueLight: '' })
  const toggleDark = useToggle(isDark)
  return { isDark, toggleDark }
}
