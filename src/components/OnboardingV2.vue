<script setup lang="ts">
import { ref } from "vue";
import {
  CalendarPlus,
  Plus,
  Sparkles,
  ChevronRight,
  Check,
} from "lucide-vue-next";

const emit = defineEmits<{ close: [] }>();

const currentStep = ref(0);

const steps = [
  {
    icon: CalendarPlus,
    emoji: "📅",
    title: "Añade un año",
    description:
      "Empieza seleccionando el año que quieras registrar. Puedes tener múltiples años y navegar entre ellos.",
  },
  {
    icon: Plus,
    emoji: "🎬",
    title: "Añade items",
    description:
      'Pulsa el botón "+" en cualquier categoría para añadir una película, libro, serie, juego… lo que quieras.',
  },
  {
    icon: Sparkles,
    emoji: "✨",
    title: "Enriquecimiento automático",
    description:
      "Los items se enriquecen automáticamente con portada, sinopsis, géneros y más datos de fuentes externas.",
  },
];

function next() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++;
  } else {
    emit("close");
  }
}

function prev() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center px-4"
    style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px)"
  >
    <div
      class="w-full max-w-sm rounded-2xl p-6 text-center animate-scale-in"
      style="
        background: var(--bg-elevated);
        box-shadow: var(--shadow-modal);
        border: 1px solid var(--border);
      "
    >
      <!-- Progress dots -->
      <div class="flex items-center justify-center gap-2 mb-5">
        <div
          v-for="(_, i) in steps"
          :key="i"
          class="h-1 rounded-full transition-all duration-300"
          :style="{
            width: i === currentStep ? '24px' : '8px',
            background: i <= currentStep ? 'var(--text)' : 'var(--border)',
          }"
        />
      </div>

      <!-- Step content -->
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0 translate-x-4"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-150"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-4"
        mode="out-in"
      >
        <div :key="currentStep">
          <div class="text-4xl mb-3">{{ steps[currentStep].emoji }}</div>
          <h2 class="font-display text-xl" style="color: var(--text)">
            {{ steps[currentStep].title }}
          </h2>
          <p
            class="text-sm mt-2 leading-relaxed max-w-xs mx-auto"
            style="color: var(--text-muted)"
          >
            {{ steps[currentStep].description }}
          </p>
        </div>
      </Transition>

      <!-- Navigation -->
      <div class="flex items-center justify-between mt-6">
        <button
          v-if="currentStep > 0"
          @click="prev"
          class="text-xs px-3 py-2 rounded-lg cursor-pointer"
          style="color: var(--text-muted)"
        >
          Atrás
        </button>
        <button
          v-else
          @click="emit('close')"
          class="text-xs px-3 py-2 rounded-lg cursor-pointer"
          style="color: var(--text-faint)"
        >
          Saltar
        </button>

        <button
          @click="next"
          class="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
          style="background: var(--text); color: var(--bg)"
        >
          <template v-if="currentStep < steps.length - 1">
            Siguiente
            <ChevronRight :size="14" />
          </template>
          <template v-else>
            <Check :size="14" />
            ¡Empezar!
          </template>
        </button>
      </div>
    </div>
  </div>
</template>
