import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPersistedState from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import { useCronologStore } from './stores/cronolog'
import { useSettingsStore } from './stores/settings'
import { useAuth } from './composables/useAuth'
import { useSupabaseSync } from './composables/useSupabaseSync'
import { scheduleWeeklyReminder, requestNotificationPermission } from './services/notifications'
import './assets/main.css'

const pinia = createPinia()
pinia.use(piniaPersistedState)

const app = createApp(App)
app.use(pinia)
app.use(router)

// Provide global loading state
const appLoading = { value: true }
app.provide('appLoading', appLoading)

async function bootstrap() {
  const store = useCronologStore()
  store.migrateData()

  const settingsStore = useSettingsStore()
  settingsStore.ensureApiKeys()

  const { init, isAuthenticated } = useAuth()
  await init()

  if (isAuthenticated.value) {
    const { loadFromCloud, startWatching } = useSupabaseSync()
    await loadFromCloud()
    startWatching()

    // Clean localStorage after successful cloud load (#17)
    try {
      localStorage.removeItem('cronolog')
      localStorage.removeItem('settings')
    } catch {
      // Ignore if localStorage is unavailable
    }

    // Schedule PWA push notification reminder
    requestNotificationPermission().then(() => scheduleWeeklyReminder())
  }

  appLoading.value = false
  app.mount('#app')
}

bootstrap()
