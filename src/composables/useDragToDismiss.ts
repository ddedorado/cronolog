import { ref, type Ref } from 'vue'

interface Options {
  /** Max pixels the modal should slide before snapping back. */
  threshold?: number
  /** Only allow drag when touch starts within this top area (px). 0 = anywhere. */
  handleTopArea?: number
}

/**
 * Drag-to-dismiss behaviour for bottom-sheet style modals on mobile.
 * Only activates on touch devices and when the scrollable content is at the top.
 *
 * Usage:
 *   const { modalRef, dragStyle, onTouchStart, onTouchMove, onTouchEnd } =
 *     useDragToDismiss(() => emit('close'))
 */
export function useDragToDismiss(onDismiss: () => void, opts: Options = {}) {
  const threshold = opts.threshold ?? 100
  const handleTopArea = opts.handleTopArea ?? 0

  const modalRef = ref<HTMLElement | null>(null)
  const dragOffset = ref(0)
  const isDragging = ref(false)
  let startY = 0

  function onTouchStart(e: TouchEvent) {
    const el = modalRef.value
    if (!el) return
    if (el.scrollTop > 0) return
    if (handleTopArea > 0) {
      const rect = el.getBoundingClientRect()
      if (e.touches[0].clientY - rect.top > handleTopArea) return
    }
    startY = e.touches[0].clientY
    isDragging.value = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!isDragging.value) return
    const dy = e.touches[0].clientY - startY
    if (dy > 0) {
      dragOffset.value = dy
    } else {
      dragOffset.value = 0
    }
  }

  function onTouchEnd() {
    if (!isDragging.value) return
    isDragging.value = false
    if (dragOffset.value > threshold) {
      onDismiss()
    }
    dragOffset.value = 0
  }

  const dragStyle = {
    get transform() {
      return dragOffset.value > 0 ? `translateY(${dragOffset.value}px)` : undefined
    },
    get transition() {
      return isDragging.value ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out'
    },
    get opacity() {
      return dragOffset.value > 0 ? Math.max(0.5, 1 - dragOffset.value / 300) : 1
    },
  }

  return {
    modalRef: modalRef as Ref<HTMLElement | null>,
    dragOffset,
    isDragging,
    dragStyle,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  }
}
