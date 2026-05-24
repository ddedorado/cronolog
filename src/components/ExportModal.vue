<script setup lang="ts">
import { ref, computed } from "vue";
import { useCronologStore } from "@/stores/cronolog";
import { useToast } from "@/composables/useToast";
import { doExport, type ExportFormat } from "@/services/exportImport";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import { useDragToDismiss } from "@/composables/useDragToDismiss";

useBodyScrollLock();

import {
  X,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  HelpCircle,
} from "lucide-vue-next";

const emit = defineEmits<{ close: [] }>();

const { modalRef, dragStyle, onTouchStart, onTouchMove, onTouchEnd } =
  useDragToDismiss(() => emit("close"));

const store = useCronologStore();
const toast = useToast();

const format = ref<ExportFormat>("xlsx");
const selectedYears = ref<number[]>([...store.availableYears]);
const showModelHelp = ref(false);
const exporting = ref(false);

const formats: {
  value: ExportFormat;
  label: string;
  icon: any;
  desc: string;
}[] = [
  {
    value: "xlsx",
    label: "Excel",
    icon: FileSpreadsheet,
    desc: "Hojas de cálculo (.xlsx)",
  },
  {
    value: "csv",
    label: "CSV",
    icon: FileText,
    desc: "Texto delimitado (.csv)",
  },
  {
    value: "json",
    label: "JSON",
    icon: FileJson,
    desc: "Backup completo (.json)",
  },
];

const allSelected = computed(
  () => selectedYears.value.length === store.availableYears.length,
);

function toggleYear(year: number) {
  const idx = selectedYears.value.indexOf(year);
  if (idx >= 0) {
    selectedYears.value.splice(idx, 1);
  } else {
    selectedYears.value.push(year);
  }
}

function toggleAll() {
  if (allSelected.value) {
    selectedYears.value = [];
  } else {
    selectedYears.value = [...store.availableYears];
  }
}

const itemCount = computed(() => {
  if (selectedYears.value.length === 0) return store.items.length;
  return store.items.filter((i) => selectedYears.value.includes(i.year)).length;
});

async function handleExport() {
  if (exporting.value) return;
  if (selectedYears.value.length === 0 && format.value !== "json") {
    toast.error("Selecciona al menos un año");
    return;
  }
  exporting.value = true;
  try {
    const result = await doExport({
      format: format.value,
      years: selectedYears.value,
      categories: store.categories,
      items: store.items,
      addedYears: store.addedYears,
    });

    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(
      `${itemCount.value} items exportados como ${format.value.toUpperCase()}`,
    );
    emit("close");
  } catch {
    toast.error("Error al exportar datos");
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div
    class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in"
    style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px)"
    @click.self="emit('close')"
  >
    <div
      ref="modalRef"
      class="w-full max-w-md rounded-xl p-5 animate-scale-in max-h-[85vh] overflow-y-auto"
      style="
        background: var(--bg-elevated);
        box-shadow: var(--shadow-modal);
        border: 1px solid var(--border);
      "
      :style="{
        transform: dragStyle.transform,
        transition: dragStyle.transition,
        opacity: dragStyle.opacity,
      }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-display text-lg" style="color: var(--text)">
          Exportar datos
        </h2>
        <button
          @click="emit('close')"
          class="p-1 rounded-md cursor-pointer"
          style="color: var(--text-faint)"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Format selector -->
      <label
        class="text-xs font-medium mb-2 block"
        style="color: var(--text-muted)"
        >Formato</label
      >
      <div class="grid grid-cols-3 gap-2 mb-4">
        <button
          v-for="f in formats"
          :key="f.value"
          @click="format = f.value"
          class="flex flex-col items-center gap-1.5 p-3 rounded-lg cursor-pointer transition-all"
          :style="{
            background: format === f.value ? 'var(--bg-muted)' : 'transparent',
            border: `1.5px solid ${format === f.value ? 'var(--text)' : 'var(--border)'}`,
          }"
        >
          <component
            :is="f.icon"
            :size="20"
            :style="{
              color: format === f.value ? 'var(--text)' : 'var(--text-faint)',
            }"
          />
          <span
            class="text-xs font-medium"
            :style="{
              color: format === f.value ? 'var(--text)' : 'var(--text-muted)',
            }"
            >{{ f.label }}</span
          >
          <span class="text-[9px]" style="color: var(--text-faint)">{{
            f.desc
          }}</span>
        </button>
      </div>

      <!-- Year selector -->
      <div class="flex items-center justify-between mb-2">
        <label class="text-xs font-medium" style="color: var(--text-muted)"
          >Años a exportar</label
        >
        <button
          @click="toggleAll"
          class="text-[10px] cursor-pointer"
          style="color: var(--text-faint)"
        >
          {{ allSelected ? "Ninguno" : "Todos" }}
        </button>
      </div>
      <div class="flex flex-wrap gap-1.5 mb-4">
        <button
          v-for="year in store.availableYears"
          :key="year"
          @click="toggleYear(year)"
          class="px-2.5 py-1 rounded-full text-xs font-mono cursor-pointer transition-all"
          :style="{
            background: selectedYears.includes(year)
              ? 'var(--text)'
              : 'var(--bg-muted)',
            color: selectedYears.includes(year)
              ? 'var(--bg)'
              : 'var(--text-muted)',
            border: `1px solid ${selectedYears.includes(year) ? 'var(--text)' : 'var(--border)'}`,
          }"
        >
          {{ year }}
        </button>
      </div>

      <!-- Preview count -->
      <div
        class="flex items-center justify-between px-3 py-2 rounded-lg mb-4"
        style="background: var(--bg-muted); border: 1px solid var(--border)"
      >
        <span class="text-xs" style="color: var(--text-muted)"
          >Items a exportar</span
        >
        <span
          class="text-sm font-mono font-medium"
          style="color: var(--text)"
          >{{ itemCount }}</span
        >
      </div>

      <!-- Model tooltip -->
      <div class="mb-4">
        <button
          @click="showModelHelp = !showModelHelp"
          class="flex items-center gap-1.5 text-[10px] cursor-pointer"
          style="color: var(--text-faint)"
        >
          <HelpCircle :size="12" />
          {{ showModelHelp ? "Ocultar" : "Ver" }} modelo de datos
        </button>
        <div
          v-if="showModelHelp"
          class="mt-2 p-3 rounded-lg text-[10px] font-mono leading-relaxed overflow-x-auto"
          style="
            background: var(--bg-muted);
            color: var(--text-muted);
            border: 1px solid var(--border);
          "
        >
          <table class="w-full">
            <thead>
              <tr style="color: var(--text)">
                <th class="text-left pr-3 pb-1">Columna</th>
                <th class="text-left pr-3 pb-1">Tipo</th>
                <th class="text-left pb-1">Req.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="pr-3">title</td>
                <td class="pr-3">texto</td>
                <td>✅</td>
              </tr>
              <tr>
                <td class="pr-3">category</td>
                <td class="pr-3">texto</td>
                <td>✅</td>
              </tr>
              <tr>
                <td class="pr-3">year</td>
                <td class="pr-3">número</td>
                <td>✅</td>
              </tr>
              <tr>
                <td class="pr-3">rating</td>
                <td class="pr-3">0–5</td>
                <td></td>
              </tr>
              <tr>
                <td class="pr-3">releaseYear</td>
                <td class="pr-3">número</td>
                <td></td>
              </tr>
              <tr>
                <td class="pr-3">consumedDate</td>
                <td class="pr-3">YYYY-MM-DD</td>
                <td></td>
              </tr>
              <tr>
                <td class="pr-3">status</td>
                <td class="pr-3">completed|in-progress|backlog</td>
                <td></td>
              </tr>
              <tr>
                <td class="pr-3">favorite</td>
                <td class="pr-3">true/false</td>
                <td></td>
              </tr>
              <tr>
                <td class="pr-3">notes</td>
                <td class="pr-3">texto</td>
                <td></td>
              </tr>
              <tr>
                <td class="pr-3">tags</td>
                <td class="pr-3">coma-separado</td>
                <td></td>
              </tr>
              <tr>
                <td class="pr-3">imageUrl</td>
                <td class="pr-3">URL</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <p class="mt-2" style="color: var(--text-faint)">
            JSON exporta backup completo (categorías + items). CSV/XLSX usan
            tabla plana.
          </p>
        </div>
      </div>

      <!-- Export button -->
      <button
        @click="handleExport"
        :disabled="itemCount === 0 || exporting"
        class="w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style="background: var(--text); color: var(--bg)"
      >
        <Download :size="14" />
        {{ exporting ? "Exportando..." : `Exportar ${itemCount} items` }}
      </button>
    </div>
  </div>
</template>
