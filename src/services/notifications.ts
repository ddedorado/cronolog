// PWA push notification helpers
// These require the browser Notification API and ServiceWorker

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function scheduleWeeklyReminder() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  // Store the last reminder date
  const lastReminder = localStorage.getItem('cronolog_last_reminder')
  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000

  if (lastReminder && now - parseInt(lastReminder) < weekMs) return

  // Check if user has been inactive (no items added in the last week)
  const lastActivity = localStorage.getItem('cronolog_last_activity')
  if (lastActivity && now - parseInt(lastActivity) < weekMs) return

  // Show notification
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: {
          title: '📝 ¿Qué has visto/leído/jugado?',
          body: 'Pásate por Cronolog y registra lo último que hayas disfrutado',
          tag: 'weekly-reminder',
        },
      })
    } else {
      new Notification('📝 ¿Qué has visto/leído/jugado?', {
        body: 'Pásate por Cronolog y registra lo último que hayas disfrutado',
        tag: 'weekly-reminder',
        icon: '/pwa-192x192.svg',
      })
    }
    localStorage.setItem('cronolog_last_reminder', String(now))
  } catch {
    // Notification failed, ignore
  }
}

export function trackActivity() {
  try {
    localStorage.setItem('cronolog_last_activity', String(Date.now()))
  } catch {
    // Ignore unavailable storage.
  }
}
