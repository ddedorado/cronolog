import { ref, type Ref } from 'vue'

export function useSwipeActions() {
  const swipedItemId = ref<string | null>(null)
  const swipeOffset = ref(0)
  const threshold = 80

  let startX = 0
  let startY = 0
  let swiping = false
  let currentId: string | null = null

  function onTouchStart(e: TouchEvent, itemId: string) {
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    swiping = false
    currentId = itemId
  }

  function onTouchMove(e: TouchEvent) {
    if (!currentId) return
    const dx = e.touches[0].clientX - startX
    const dy = e.touches[0].clientY - startY

    // If vertical movement is dominant, don't swipe
    if (!swiping && Math.abs(dy) > Math.abs(dx)) {
      currentId = null
      return
    }

    // Only swipe left
    if (dx < -10) {
      swiping = true
      swipedItemId.value = currentId
      swipeOffset.value = Math.max(dx, -160)
      e.preventDefault()
    }
  }

  function onTouchEnd() {
    if (!swiping || !currentId) {
      currentId = null
      return
    }

    if (Math.abs(swipeOffset.value) >= threshold) {
      // Keep swiped open
      swipeOffset.value = -160
    } else {
      // Snap back
      swipedItemId.value = null
      swipeOffset.value = 0
    }
    currentId = null
    swiping = false
  }

  function resetSwipe() {
    swipedItemId.value = null
    swipeOffset.value = 0
  }

  return {
    swipedItemId,
    swipeOffset,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    resetSwipe,
  }
}
