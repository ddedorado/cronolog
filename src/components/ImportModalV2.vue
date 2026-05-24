<script setup lang="ts">
import { ref, computed } from "vue";
import { useCronologStore } from "@/stores/cronolog";
import { useToast } from "@/composables/useToast";
import {
  importJSON,
  importCSV,
  importXLSX,
  detectFormatFromFile,
  type ExportFormat,
} from "@/services/exportImport";
import { importFromFile, type ImportSource } from "@/services/import";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import { useDragToDismiss } from "@/composables/useDragToDismiss";

useBodyScrollLock();
import {
  Upload,
  FileText,
  FileJson,
  FileSpreadsheet,
  X,
  Check,
  AlertTriangle,
  HelpCircle,
} from "lucide-vue-next";

const emit = defineEmits<{ close: [] }>();

const { modalRef, dragStyle, onTouchStart, onTouchMove, onTouchEnd } =
  useDragToDismiss(() => emit("close"));

const store = useCronologStore();
const toast = useToast();

type SourceType = "cronolog" | "letterboxd" | "goodreads" | "mal";

const sourceType = ref<SourceType>("cronolog");
const fileFormat = ref<ExportFormat>("json");
const fileName = ref("");
const fileContent = ref<string | ArrayBuffer | null>(null);
const previewCount = ref(0);
const previewYears = ref<number[]>([]);
const previewErrors = ref<string[]>([]);
const showModelHelp = ref(false);

const sourceTypes: { value: SourceType; label: string; desc: string }[] = [
  {
    value: "cronolog",
    label: "Cronolog",
    desc: "JSON, CSV o XLSX con el modelo estándar",
  },
  {
    value: "letterboxd",
    label: "Letterboxd",
    desc: "CSV desde letterboxd.com/settings/data",
  },
  {
    value: "goodreads",
    label: "Goodreads",
    desc: "CSV desde goodreads.com/review/import",
  },
  {
    value: "mal",
    label: "MyAnimeList",
    desc: "CSV desde myanimelist.net/panel.php?go=export",
  },
];

const acceptedFormats = computed(() => {
  if (sourceType.value === "cronolog") return ".json,.csv,.xlsx,.xls";
  return ".csv,.txt";
});

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  fileName.value = file.name;
  previewErrors.value = [];

  if (sourceType.value === "cronolog") {
    fileFormat.value = detectFormatFromFile(file.name);

    if (fileFormat.value === "xlsx") {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        fileContent.value = buffer;
        const result = await importXLSX(buffer, store.categories);
        previewCount.value = result.items.length;
        previewYears.value = result.years;
        previewErrors.value = result.errors;
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        fileContent.value = text;
        const result =
          fileFormat.value === "json"
            ? importJSON(text, store.categories)
            : importCSV(text, store.categories);
        previewCount.value = result.items.length;
        previewYears.value = result.years;
        previewErrors.value = result.errors;
      };
      reader.readAsText(file);
    }
  } else {
    // Legacy import (Letterboxd, Goodreads, MAL)
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      fileContent.value = text;
      try {
        const source = sourceType.value as ImportSource;
        const items = importFromFile(
          text,
          source,
          store.activeYear,
          store.sortedCategories[0]?.id ?? "",
        );
        previewCount.value = items.length;
        previewYears.value = [store.activeYear];
        previewErrors.value = [];
      } catch {
        previewCount.value = 0;
        previewErrors.value = ["Error al parsear el archivo"];
      }
    };
    reader.readAsText(file);
  }
}

async function doImport() {
  if (!fileContent.value) return;

  try {
    if (sourceType.value === "cronolog") {
      let result;
      if (fileFormat.value === "xlsx") {
        result = await importXLSX(fileContent.value as ArrayBuffer, store.categories);
      } else if (fileFormat.value === "json") {
        result = importJSON(fileContent.value as string, store.categories);
      } else {
        result = importCSV(fileContent.value as string, store.categories);
      }

      // Ensure years exist
      for (const year of result.years) {
        if (!store.availableYears.includes(year)) {
          store.addYear(year);
        }
      }

      for (const item of result.items) {
        store.addItem(item);
      }

      if (result.errors.length > 0) {
        toast.info(
          `${result.items.length} items importados (${result.errors.length} avisos)`,
        );
      } else {
        toast.success(`${result.items.length} items importados correctamente`);
      }
    } else {
      const source = sourceType.value as ImportSource;
      const items = importFromFile(
        fileContent.value as string,
        source,
        store.activeYear,
        store.sortedCategories[0]?.id ?? "",
      );
      for (const item of items) {
        store.addItem(item);
      }
      toast.success(`${items.length} items importados correctamente`);
    }
    emit("close");
  } catch {
    toast.error("Error al importar: formato no válido");
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
          Importar datos
        </h2>
        <button
          @click="emit('close')"
          class="p-1 rounded-md cursor-pointer"
          style="color: var(--text-faint)"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Source type selector -->
      <label
        class="text-xs font-medium mb-2 block"
        style="color: var(--text-muted)"
        >Origen</label
      >
      <div class="grid grid-cols-2 gap-2 mb-4">
        <button
          v-for="s in sourceTypes"
          :key="s.value"
          @click="
            sourceType = s.value;
            fileContent = null;
            fileName = '';
            previewCount = 0;
            previewErrors = [];
          "
          class="p-2.5 rounded-lg text-left cursor-pointer transition-all"
          :style="{
            background:
              sourceType === s.value ? 'var(--bg-muted)' : 'transparent',
            border: `1.5px solid ${sourceType === s.value ? 'var(--text)' : 'var(--border)'}`,
          }"
        >
          <span class="text-xs font-medium block" style="color: var(--text)">{{
            s.label
          }}</span>
          <span
            class="text-[10px] mt-0.5 block leading-snug"
            style="color: var(--text-faint)"
            >{{ s.desc }}</span
          >
        </button>
      </div>

      <!-- Format info for Cronolog imports -->
      <div
        v-if="sourceType === 'cronolog'"
        class="flex items-center gap-3 px-3 py-2 rounded-lg mb-4"
        style="background: var(--bg-muted); border: 1px solid var(--border)"
      >
        <FileJson :size="14" style="color: var(--text-faint)" />
        <FileText :size="14" style="color: var(--text-faint)" />
        <FileSpreadsheet :size="14" style="color: var(--text-faint)" />
        <span class="text-[10px]" style="color: var(--text-muted)"
          >Acepta .json, .csv y .xlsx — se detecta automáticamente</span
        >
      </div>

      <!-- Model help tooltip -->
      <div class="mb-4">
        <button
          @click="showModelHelp = !showModelHelp"
          class="flex items-center gap-1.5 text-[10px] cursor-pointer"
          style="color: var(--text-faint)"
        >
          <HelpCircle :size="12" />
          {{ showModelHelp ? "Ocultar" : "Ver" }} modelo de datos esperado
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
          <p
            class="mb-2"
            style="color: var(--text); font-family: var(--font-body)"
          >
            Para CSV y XLSX usa estas columnas como cabecera:
          </p>
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
                <td class="pr-3">nombre de categoría</td>
                <td>✅</td>
              </tr>
              <tr>
                <td class="pr-3">year</td>
                <td class="pr-3">número (ej: 2026)</td>
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
                <td class="pr-3">completed | in-progress | backlog</td>
                <td></td>
              </tr>
              <tr>
                <td class="pr-3">favorite</td>
                <td class="pr-3">true / false</td>
                <td></td>
              </tr>
              <tr>
                <td class="pr-3">notes</td>
                <td class="pr-3">texto libre</td>
                <td></td>
              </tr>
              <tr>
                <td class="pr-3">tags</td>
                <td class="pr-3">coma-separado</td>
                <td></td>
              </tr>
              <tr>
                <td class="pr-3">imageUrl</td>
                <td class="pr-3">URL de imagen</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <p
            class="mt-2"
            style="color: var(--text-faint); font-family: var(--font-body)"
          >
            JSON admite también el formato de backup completo de Cronolog (con
            categorías, items y años).
          </p>
        </div>
      </div>

      <!-- File upload -->
      <label
        class="flex flex-col items-center gap-2 p-6 rounded-lg cursor-pointer transition-colors"
        :style="{
          background: fileContent ? 'var(--bg-muted)' : 'transparent',
          border: `2px dashed ${fileContent ? 'var(--text)' : 'var(--border)'}`,
        }"
      >
        <input
          type="file"
          :accept="acceptedFormats"
          class="hidden"
          @change="onFileSelect"
        />
        <FileText
          v-if="!fileContent"
          :size="24"
          style="color: var(--text-faint)"
        />
        <Check v-else :size="24" style="color: #22c55e" />
        <span class="text-xs text-center" style="color: var(--text-muted)">
          {{ fileName || "Arrastra o selecciona un archivo" }}
        </span>
        <span
          v-if="previewCount > 0"
          class="text-xs font-medium"
          style="color: var(--text)"
        >
          {{ previewCount }} items detectados
          <span
            v-if="previewYears.length > 0"
            class="font-mono"
            style="color: var(--text-faint)"
          >
            ({{ previewYears.join(", ") }})
          </span>
        </span>
      </label>

      <!-- Errors/warnings -->
      <div
        v-if="previewErrors.length > 0"
        class="mt-3 p-2.5 rounded-lg max-h-24 overflow-y-auto"
        style="background: #f59e0b10; border: 1px solid #f59e0b30"
      >
        <div class="flex items-center gap-1.5 mb-1">
          <AlertTriangle :size="12" style="color: #f59e0b" />
          <span class="text-[10px] font-medium" style="color: #f59e0b"
            >{{ previewErrors.length }} avisos</span
          >
        </div>
        <div class="space-y-0.5">
          <p
            v-for="(err, i) in previewErrors.slice(0, 5)"
            :key="i"
            class="text-[10px]"
            style="color: var(--text-faint)"
          >
            {{ err }}
          </p>
          <p
            v-if="previewErrors.length > 5"
            class="text-[10px]"
            style="color: var(--text-faint)"
          >
            ...y {{ previewErrors.length - 5 }} más
          </p>
        </div>
      </div>

      <!-- Import button -->
      <button
        @click="doImport"
        :disabled="!fileContent || previewCount === 0"
        class="w-full mt-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style="background: var(--text); color: var(--bg)"
      >
        <Upload :size="14" />
        Importar {{ previewCount }} items
      </button>
    </div>
  </div>
</template>
