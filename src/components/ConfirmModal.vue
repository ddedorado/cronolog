<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { AlertTriangle, X } from "lucide-vue-next";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";

useBodyScrollLock();

const props = defineProps<{
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function handleBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains("modal-backdrop")) {
    emit("cancel");
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("cancel");
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onUnmounted(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <div
      class="modal-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4"
      @click="handleBackdropClick"
    >
      <!-- Overlay -->
      <div
        class="absolute inset-0 animate-fade-in"
        style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(6px)"
      />

      <!-- Dialog -->
      <div
        class="relative w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in"
        style="
          background: var(--bg-elevated);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
        "
      >
        <!-- Danger stripe -->
        <div
          v-if="danger"
          class="h-1"
          style="background: linear-gradient(90deg, #ef4444, #dc2626)"
        />

        <div class="p-6">
          <!-- Icon + Title -->
          <div class="flex items-start gap-3">
            <div
              class="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              :style="{
                background: danger ? '#EF444415' : 'var(--bg-muted)',
              }"
            >
              <AlertTriangle
                :size="20"
                :style="{ color: danger ? '#EF4444' : 'var(--text-muted)' }"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3
                class="font-display text-lg leading-tight"
                style="color: var(--text)"
              >
                {{ title }}
              </h3>
              <p
                class="text-sm mt-1.5 leading-relaxed"
                style="color: var(--text-muted)"
              >
                {{ message }}
              </p>
            </div>
            <button
              @click="emit('cancel')"
              class="shrink-0 p-1 rounded-lg cursor-pointer transition-colors"
              style="color: var(--text-faint)"
            >
              <X :size="16" />
            </button>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2.5 mt-6">
            <button
              @click="emit('cancel')"
              class="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200"
              style="
                color: var(--text-muted);
                background: var(--bg-muted);
                border: 1px solid var(--border);
              "
            >
              {{ cancelText ?? "Cancelar" }}
            </button>
            <button
              @click="emit('confirm')"
              class="flex-1 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer transition-all duration-200"
              :style="{
                background: danger ? '#EF4444' : 'var(--text)',
              }"
            >
              {{ confirmText ?? "Eliminar" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
