<script setup lang="ts">
import { ref } from "vue";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
} from "lucide-vue-next";
import { useEnrichmentQueue } from "@/composables/useEnrichmentQueue";

const {
  queue,
  hasTasks,
  completedCount,
  totalCount,
  hasErrors,
  retryErrors,
  dismiss,
} = useEnrichmentQueue();

const collapsed = ref(false);
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="hasTasks"
        class="fixed bottom-4 right-4 z-[60] w-80 rounded-xl overflow-hidden animate-scale-in"
        style="
          background: var(--bg-elevated);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border);
        "
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none"
          style="border-bottom: 1px solid var(--border)"
          @click="collapsed = !collapsed"
        >
          <div class="flex items-center gap-2">
            <Loader2
              v-if="completedCount < totalCount && !hasErrors"
              :size="15"
              class="animate-spin"
              style="color: #3b82f6"
            />
            <CheckCircle2
              v-else-if="!hasErrors"
              :size="15"
              style="color: #22c55e"
            />
            <AlertCircle v-else :size="15" style="color: #ef4444" />

            <span class="text-xs font-medium" style="color: var(--text)">
              <template v-if="completedCount < totalCount && !hasErrors">
                Enriqueciendo... ({{ completedCount }}/{{ totalCount }})
              </template>
              <template v-else-if="!hasErrors">
                Enriquecimiento completado
              </template>
              <template v-else> Errores en enriquecimiento </template>
            </span>
          </div>

          <div class="flex items-center gap-1">
            <button
              v-if="hasErrors"
              @click.stop="retryErrors"
              class="p-1 rounded cursor-pointer"
              style="color: var(--text-muted)"
              title="Reintentar errores"
            >
              <RotateCcw :size="13" />
            </button>
            <component
              :is="collapsed ? ChevronUp : ChevronDown"
              :size="14"
              style="color: var(--text-faint)"
            />
            <button
              @click.stop="dismiss"
              class="p-0.5 rounded cursor-pointer"
              style="color: var(--text-faint)"
            >
              <X :size="13" />
            </button>
          </div>
        </div>

        <!-- Task list -->
        <div v-if="!collapsed" class="max-h-48 overflow-y-auto">
          <div
            v-for="task in queue"
            :key="task.itemId"
            class="flex items-center gap-2 px-3 py-2 text-xs"
            style="border-bottom: 1px solid var(--border)"
          >
            <!-- Status icon -->
            <Loader2
              v-if="task.status === 'running'"
              :size="12"
              class="animate-spin flex-shrink-0"
              style="color: #3b82f6"
            />
            <CheckCircle2
              v-else-if="task.status === 'done'"
              :size="12"
              class="flex-shrink-0"
              style="color: #22c55e"
            />
            <AlertCircle
              v-else-if="task.status === 'error'"
              :size="12"
              class="flex-shrink-0"
              style="color: #ef4444"
            />
            <div
              v-else
              class="w-3 h-3 rounded-full flex-shrink-0"
              style="background: var(--text-faint); opacity: 0.3"
            />

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <span class="truncate block" style="color: var(--text)">{{
                task.itemTitle
              }}</span>
              <span
                v-if="task.status === 'error' && task.error"
                class="truncate block"
                style="color: #ef4444"
                >{{ task.error }}</span
              >
            </div>

            <!-- Category badge -->
            <span
              class="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px]"
              :style="{
                background: task.categoryColor + '15',
                color: task.categoryColor,
              }"
            >
              {{ task.categoryName }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
