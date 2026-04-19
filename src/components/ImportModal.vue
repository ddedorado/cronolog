<script setup lang="ts">
import { ref, computed } from "vue";
import { useCronologStore } from "@/stores/cronolog";
import { useToast } from "@/composables/useToast";
import {
  importFromFile,
  detectImportSource,
  type ImportSource,
} from "@/services/import";
import { Upload, FileText, X, Check } from "lucide-vue-next";

const emit = defineEmits<{ close: [] }>();

const store = useCronologStore();
const toast = useToast();

const source = ref<ImportSource>("csv");
const categoryId = ref(store.sortedCategories[0]?.id ?? "");
const fileContent = ref("");
const fileName = ref("");
const previewCount = ref(0);

const sources: { value: ImportSource; label: string; desc: string }[] = [
  { value: "csv", label: "CSV genérico", desc: "title, rating, year, date" },
  {
    value: "letterboxd",
    label: "Letterboxd",
    desc: "Exporta desde letterboxd.com/settings/data",
  },
  {
    value: "goodreads",
    label: "Goodreads",
    desc: "Exporta desde goodreads.com/review/import",
  },
  {
    value: "mal",
    label: "MyAnimeList",
    desc: "Exporta desde myanimelist.net/panel.php?go=export",
  },
];

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  fileName.value = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result as string;
    fileContent.value = text;
    source.value = detectImportSource(text);
    // Preview count
    try {
      const items = importFromFile(
        text,
        source.value,
        store.activeYear,
        categoryId.value,
      );
      previewCount.value = items.length;
    } catch {
      previewCount.value = 0;
    }
  };
  reader.readAsText(file);
}

function doImport() {
  if (!fileContent.value) return;
  try {
    const items = importFromFile(
      fileContent.value,
      source.value,
      store.activeYear,
      categoryId.value,
    );
    for (const item of items) {
      store.addItem(item);
    }
    toast.success(`${items.length} items importados correctamente`);
    emit("close");
  } catch (err) {
    toast.error("Error al importar: formato no válido");
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center px-4"
    style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px)"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-md rounded-xl p-5 animate-scale-in max-h-[85vh] overflow-y-auto"
      style="
        background: var(--bg-elevated);
        box-shadow: var(--shadow-modal);
        border: 1px solid var(--border);
      "
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

      <!-- Source selector -->
      <div class="grid grid-cols-2 gap-2 mb-4">
        <button
          v-for="s in sources"
          :key="s.value"
          @click="source = s.value"
          class="p-2.5 rounded-lg text-left cursor-pointer transition-all"
          :style="{
            background: source === s.value ? 'var(--bg-muted)' : 'transparent',
            border: `1px solid ${source === s.value ? 'var(--text)' : 'var(--border)'}`,
          }"
        >
          <span class="text-xs font-medium block" style="color: var(--text)">{{
            s.label
          }}</span>
          <span
            class="text-[10px] mt-0.5 block"
            style="color: var(--text-faint)"
            >{{ s.desc }}</span
          >
        </button>
      </div>

      <!-- Category selector (for generic CSV) -->
      <div v-if="source === 'csv'" class="mb-4">
        <label
          class="text-xs font-medium mb-1.5 block"
          style="color: var(--text-muted)"
          >Categoría destino</label
        >
        <select
          v-model="categoryId"
          class="w-full px-3 py-2 rounded-lg text-sm"
          style="
            background: var(--bg-muted);
            color: var(--text);
            border: 1px solid var(--border);
          "
        >
          <option
            v-for="cat in store.sortedCategories"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.name }}
          </option>
        </select>
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
          accept=".csv,.txt,.xml"
          class="hidden"
          @change="onFileSelect"
        />
        <FileText
          v-if="!fileContent"
          :size="24"
          style="color: var(--text-faint)"
        />
        <Check v-else :size="24" style="color: #22c55e" />
        <span class="text-xs" style="color: var(--text-muted)">
          {{ fileName || "Arrastra o selecciona un archivo CSV" }}
        </span>
        <span
          v-if="previewCount > 0"
          class="text-xs font-medium"
          style="color: var(--text)"
        >
          {{ previewCount }} items detectados
        </span>
      </label>

      <!-- Import button -->
      <button
        @click="doImport"
        :disabled="!fileContent || previewCount === 0"
        class="w-full mt-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style="background: var(--text); color: var(--bg)"
      >
        <Upload :size="14" class="inline mr-1.5" />
        Importar {{ previewCount }} items
      </button>
    </div>
  </div>
</template>
