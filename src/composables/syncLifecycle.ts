import type { WatchStopHandle } from 'vue'

const stopHandles: WatchStopHandle[] = []

export function hasSyncWatchers() {
  return stopHandles.length > 0
}

export function setSyncWatchers(handles: WatchStopHandle[]) {
  stopSyncWatchers()
  stopHandles.push(...handles)
}

export function stopSyncWatchers() {
  while (stopHandles.length > 0) {
    stopHandles.pop()?.()
  }
}