import { ref, onMounted, onUnmounted } from 'vue'
import { useIsScrollLocked } from '@/composables/useBodyScrollLock'

/**
 * Pull-to-refresh gesture.
 *
 * Performance: we only attach the non-passive `touchmove` listener while
 * the user is actively pulling from the top, so ordinary scroll events
 * everywhere else stay fully passive (no main-thread hit).
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const pulling = ref(false)
  const pullDistance = ref(0)
  const refreshing = ref(false)
  const threshold = 80
  const scrollLocked = useIsScrollLocked()

  let startY = 0

  function onTouchStart(e: TouchEvent) {
    if (scrollLocked.value > 0) return
    if (window.scrollY > 0) return
    startY = e.touches[0].clientY
    pulling.value = true
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchEnd, { passive: true })
  }

  function onTouchMove(e: TouchEvent) {
    if (scrollLocked.value > 0 || !pulling.value || window.scrollY > 0) {
      stopPull()
      return
    }
    const delta = e.touches[0].clientY - startY
    if (delta > 0) {
      pullDistance.value = Math.min(delta * 0.5, 120)
      if (delta > 10) e.preventDefault()
    } else {
      pullDistance.value = 0
    }
  }

  async function onTouchEnd() {
    if (!pulling.value) {
      stopPull()
      return
    }
    const shouldRefresh = pullDistance.value >= threshold && !refreshing.value
    stopPull()
    if (shouldRefresh) {
      refreshing.value = true
      try {
        await onRefresh()
      } finally {
        refreshing.value = false
      }
    }
    pullDistance.value = 0
  }

  function stopPull() {
    pulling.value = false
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
    document.removeEventListener('touchcancel', onTouchEnd)
  }

  onMounted(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', onTouchStart)
    stopPull()
  })

  return { pullDistance, refreshing, threshold }
}
