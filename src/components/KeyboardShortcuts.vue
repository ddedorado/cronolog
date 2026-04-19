<script setup lang="ts">
import { X } from "lucide-vue-next";

const emit = defineEmits<{ close: [] }>();

const groups = [
  {
    title: "Navegación",
    shortcuts: [
      { keys: ["←", "→"], desc: "Cambiar año" },
      { keys: ["⌘/Ctrl", "K"], desc: "Búsqueda global" },
      { keys: ["F"], desc: "Buscar items" },
    ],
  },
  {
    title: "Acciones",
    shortcuts: [
      { keys: ["N"], desc: "Nuevo item" },
      { keys: ["S"], desc: "Abrir ajustes" },
      { keys: ["?"], desc: "Atajos de teclado" },
    ],
  },
  {
    title: "Categorías",
    shortcuts: [{ keys: ["1-9"], desc: "Ir a categoría Nª" }],
  },
  {
    title: "General",
    shortcuts: [{ keys: ["Esc"], desc: "Cerrar modal/menú" }],
  },
];
</script>

<template>
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center px-4"
    style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px)"
    @click.self="emit('close')"
    @keydown.escape="emit('close')"
  >
    <div
      class="w-full max-w-sm rounded-xl p-5 animate-scale-in"
      style="
        background: var(--bg-elevated);
        box-shadow: var(--shadow-modal);
        border: 1px solid var(--border);
      "
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-display text-lg" style="color: var(--text)">
          Atajos de teclado
        </h2>
        <button
          @click="emit('close')"
          class="p-1 rounded-md cursor-pointer"
          style="color: var(--text-faint)"
        >
          <X :size="16" />
        </button>
      </div>

      <div class="space-y-4">
        <div v-for="group in groups" :key="group.title">
          <h3
            class="text-[10px] uppercase tracking-wider mb-2"
            style="color: var(--text-faint)"
          >
            {{ group.title }}
          </h3>
          <div class="space-y-1.5">
            <div
              v-for="s in group.shortcuts"
              :key="s.desc"
              class="flex items-center justify-between"
            >
              <span class="text-xs" style="color: var(--text-muted)">{{
                s.desc
              }}</span>
              <div class="flex items-center gap-1">
                <kbd
                  v-for="k in s.keys"
                  :key="k"
                  class="text-[10px] font-mono px-1.5 py-0.5 rounded min-w-[20px] text-center"
                  style="
                    background: var(--bg-muted);
                    color: var(--text-muted);
                    border: 1px solid var(--border);
                  "
                  >{{ k }}</kbd
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
