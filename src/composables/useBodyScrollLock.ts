import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Shared counter so multiple modals can coexist without each one
 * restoring the scroll prematurely.
 */
const lockCount = ref(0)
let savedScrollY = 0
let savedBodyStyle = {
  position: '',
  top: '',
  left: '',
  right: '',
  width: '',
  overflow: '',
}

function applyLock() {
  savedScrollY = window.scrollY || window.pageYOffset || 0
  const body = document.body
  savedBodyStyle = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
  }
  // position:fixed trick: keeps momentum scrolling locked on iOS
  body.style.position = 'fixed'
  body.style.top = `-${savedScrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
}

function releaseLock() {
  const body = document.body
  body.style.position = savedBodyStyle.position
  body.style.top = savedBodyStyle.top
  body.style.left = savedBodyStyle.left
  body.style.right = savedBodyStyle.right
  body.style.width = savedBodyStyle.width
  body.style.overflow = savedBodyStyle.overflow
  document.documentElement.style.overflow = ''
  // Restore scroll position instantly (no smooth jump)
  window.scrollTo(0, savedScrollY)
}

/**
 * Lock the body scroll for the lifetime of the calling component.
 * Safe to nest (multiple modals open at once). Use inside modal components.
 */
export function useBodyScrollLock() {
  let hasLocked = false

  onMounted(() => {
    if (typeof window === 'undefined') return
    if (lockCount.value === 0) applyLock()
    lockCount.value++
    hasLocked = true
  })

  onBeforeUnmount(() => {
    if (!hasLocked) return
    lockCount.value = Math.max(0, lockCount.value - 1)
    if (lockCount.value === 0) releaseLock()
    hasLocked = false
  })
}

/** Read-only signal for other composables (e.g. pull-to-refresh). */
export function useIsScrollLocked() {
  return lockCount
}
