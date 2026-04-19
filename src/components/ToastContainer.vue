<script setup lang="ts">
import { useToast } from "@/composables/useToast";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-vue-next";

const { toasts, removeToast } = useToast();

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap: Record<string, string> = {
  success: "#22c55e",
  error: "#ef4444",
  info: "#3b82f6",
  warning: "#f59e0b",
};
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed bottom-4 left-4 z-[70] flex flex-col gap-2 pointer-events-none"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="translate-x-[-20px] opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-[-20px] opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-2.5 pl-3 pr-2 py-2.5 rounded-xl max-w-xs animate-scale-in"
          style="
            background: var(--bg-elevated);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
            border: 1px solid var(--border);
          "
        >
          <div
            class="w-1 h-8 rounded-full flex-shrink-0"
            :style="{ background: colorMap[toast.type] }"
          />
          <component
            :is="iconMap[toast.type]"
            :size="15"
            class="flex-shrink-0"
            :style="{ color: colorMap[toast.type] }"
          />
          <span
            class="text-xs flex-1 leading-relaxed"
            style="color: var(--text)"
          >
            {{ toast.message }}
          </span>
          <button
            v-if="toast.action"
            @click="
              toast.action.handler();
              removeToast(toast.id);
            "
            class="text-xs font-semibold px-2 py-1 rounded-md cursor-pointer transition-colors flex-shrink-0"
            :style="{
              color: colorMap[toast.type],
              background: colorMap[toast.type] + '15',
            }"
          >
            {{ toast.action.label }}
          </button>
          <button
            @click="removeToast(toast.id)"
            class="p-0.5 rounded cursor-pointer flex-shrink-0"
            style="color: var(--text-faint)"
          >
            <X :size="12" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
