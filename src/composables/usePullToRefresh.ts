import { ref, onMounted, onUnmounted } from 'vue'

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const pulling = ref(false)
  const pullDistance = ref(0)
  const refreshing = ref(false)
  const threshold = 80

  let startY = 0
  let currentY = 0

  function onTouchStart(e: TouchEvent) {
    if (window.scrollY > 0) return
    startY = e.touches[0].clientY
    pulling.value = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!pulling.value || window.scrollY > 0) {
      pulling.value = false
      pullDistance.value = 0
      return
    }
    currentY = e.touches[0].clientY
    const delta = currentY - startY
    if (delta > 0) {
      pullDistance.value = Math.min(delta * 0.5, 120)
      if (delta > 10) e.preventDefault()
    }
  }

  async function onTouchEnd() {
    if (!pulling.value) return
    pulling.value = false
    if (pullDistance.value >= threshold && !refreshing.value) {
      refreshing.value = true
      try {
        await onRefresh()
      } finally {
        refreshing.value = false
      }
    }
    pullDistance.value = 0
  }

  onMounted(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
  })

  return { pullDistance, refreshing, threshold }
}
