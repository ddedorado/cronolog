import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { watch } from 'vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('@/pages/AuthPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/pages/ProfilePage.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// Watch for session expiry and redirect
let sessionWatchStarted = false
function startSessionWatch() {
  if (sessionWatchStarted) return
  sessionWatchStarted = true
  const { sessionExpired } = useAuth()
  const toast = useToast()
  watch(sessionExpired, (expired) => {
    if (expired) {
      sessionExpired.value = false
      toast.warning('Tu sesión ha expirado')
      router.push({ name: 'auth' })
    }
  })
}

router.beforeEach(async (to) => {
  const { isAuthenticated, loading, init } = useAuth()

  await init()
  startSessionWatch()

  if (loading.value) {
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (!loading.value) {
          clearInterval(check)
          resolve()
        }
      }, 50)
    })
  }

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { name: 'auth' }
  }

  if (to.meta.guest && isAuthenticated.value) {
    return { name: 'home' }
  }
})

export default router
