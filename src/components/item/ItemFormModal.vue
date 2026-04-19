<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useCronologStore } from "@/stores/cronolog";
import type { Item } from "@/schemas/cronolog";
import { generateId, todayISO } from "@/utils/helpers";
import { X, Trash2, Sparkles, Loader2 } from "lucide-vue-next";
import StarRating from "@/components/StarRating.vue";
import ConfirmModal from "@/components/ConfirmModal.vue";
import { useSettingsStore } from "@/stores/settings";
import { useEnrichmentQueue } from "@/composables/useEnrichmentQueue";
import { useToast } from "@/composables/useToast";

const props = defineProps<{
  item: Item | null;
  categoryId: string | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const store = useCronologStore();
const settingsStore = useSettingsStore();
const { enqueueItem, queue } = useEnrichmentQueue();
const toast = useToast();

const title = ref(props.item?.title ?? "");
const releaseYear = ref<number | null>(props.item?.releaseYear ?? null);
const consumedDate = ref(props.item?.consumedDate ?? todayISO());
const imageUrl = ref(props.item?.imageUrl ?? "");
const rating = ref(props.item?.rating ?? 0);
const selectedCategoryId = ref(
  props.item?.categoryId ?? props.categoryId ?? "",
);
const customFields = ref<Record<string, string | number>>({
  ...(props.item?.customFields ?? {}),
});

const isEditing = computed(() => props.item !== null);

const selectedCategory = computed(() =>
  store.categories.find((c) => c.id === selectedCategoryId.value),
);

const canEnrich = computed(() => {
  const cat = selectedCategory.value;
  if (!cat || cat.dataSource === "none") return false;
  return settingsStore.hasKeyForSource(cat.dataSource);
});

const isEnriching = computed(() => {
  if (!props.item) return false;
  return queue.value.some(
    (t) =>
      t.itemId === props.item!.id &&
      (t.status === "running" || t.status === "pending"),
  );
});

function handleEnrich() {
  if (!props.item || !selectedCategory.value) return;
  enqueueItem(props.item, selectedCategory.value);
}

function handleSubmit() {
  if (!title.value.trim() || !selectedCategoryId.value) return;

  if (isEditing.value && props.item) {
    store.updateItem(props.item.id, {
      title: title.value.trim(),
      releaseYear: releaseYear.value,
      consumedDate: consumedDate.value,
      imageUrl: imageUrl.value.trim(),
      rating: rating.value,
      categoryId: selectedCategoryId.value,
      customFields: customFields.value,
    });
  } else {
    const newItem: Item = {
      id: generateId(),
      categoryId: selectedCategoryId.value,
      year: store.activeYear,
      title: title.value.trim(),
      releaseYear: releaseYear.value,
      consumedDate: consumedDate.value,
      imageUrl: imageUrl.value.trim(),
      rating: rating.value,
      order: 0,
      status: "completed",
      favorite: false,
      notes: "",
      tags: [],
      customFields: customFields.value,
      enrichmentData: null,
      createdAt: new Date().toISOString(),
    };
    store.addItem(newItem);
  }
  emit("close");
}

function handleDelete() {
  showDeleteConfirm.value = true;
}

function confirmDelete() {
  if (props.item) {
    const restore = store.removeItemWithUndo(props.item.id);
    if (restore) {
      toast.success(`"${props.item.title}" eliminado`, {
        label: "Deshacer",
        handler: restore,
      });
    }
    emit("close");
  }
}

function handleBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains("modal-backdrop")) {
    emit("close");
  }
}

const titleInput = ref<HTMLInputElement | null>(null);
const showDeleteConfirm = ref(false);
onMounted(() => titleInput.value?.focus());
</script>

<template>
  <div
    class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    style="background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px)"
    @click="handleBackdropClick"
  >
    <div
      class="w-full max-w-md rounded-xl p-6 animate-scale-in"
      style="
        background: var(--bg-elevated);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      "
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-5">
        <h2 class="font-display text-xl" style="color: var(--text)">
          {{ isEditing ? "Editar" : "Añadir" }}
          {{ selectedCategory?.name?.slice(0, -1) ?? "elemento" }}
        </h2>
        <button
          @click="emit('close')"
          class="p-1 rounded-md cursor-pointer"
          style="color: var(--text-faint)"
        >
          <X :size="18" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Category selector (only when adding) -->
        <div v-if="!isEditing">
          <label
            class="block text-xs font-medium mb-1.5"
            style="color: var(--text-muted)"
            >Categoría</label
          >
          <select
            v-model="selectedCategoryId"
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
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

        <!-- Title -->
        <div>
          <label
            class="block text-xs font-medium mb-1.5"
            style="color: var(--text-muted)"
            >Título</label
          >
          <input
            ref="titleInput"
            v-model="title"
            type="text"
            required
            placeholder="Nombre del título..."
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text);
              border: 1px solid var(--border);
            "
          />
        </div>

        <!-- Enrich button -->
        <button
          v-if="canEnrich && isEditing"
          type="button"
          @click="handleEnrich"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors self-start"
          style="
            background: var(--bg-muted);
            color: var(--text-muted);
            border: 1px solid var(--border);
          "
          :disabled="isEnriching"
        >
          <Loader2 v-if="isEnriching" :size="13" class="animate-spin" />
          <Sparkles v-else :size="13" />
          {{ item?.enrichmentData ? "Re-enriquecer" : "Enriquecer con IA" }}
        </button>

        <!-- Image URL -->
        <div>
          <label
            class="block text-xs font-medium mb-1.5"
            style="color: var(--text-muted)"
            >Imagen (URL)</label
          >
          <input
            v-model="imageUrl"
            type="url"
            placeholder="https://..."
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text);
              border: 1px solid var(--border);
            "
          />
          <div
            v-if="imageUrl"
            class="mt-2 h-24 rounded-lg overflow-hidden"
            style="background: var(--bg-muted)"
          >
            <img
              :src="imageUrl"
              alt="Preview"
              class="w-full h-full object-cover"
              @error="
                ($event.target as HTMLImageElement).style.display = 'none'
              "
            />
          </div>
        </div>

        <!-- Release year -->
        <div>
          <label
            class="block text-xs font-medium mb-1.5"
            style="color: var(--text-muted)"
            >Año de lanzamiento</label
          >
          <input
            v-model.number="releaseYear"
            type="number"
            min="1900"
            max="2100"
            placeholder="2026"
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text);
              border: 1px solid var(--border);
            "
          />
        </div>

        <!-- Consumed date -->
        <div>
          <label
            class="block text-xs font-medium mb-1.5"
            style="color: var(--text-muted)"
            >Fecha visto/jugado</label
          >
          <input
            v-model="consumedDate"
            type="date"
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text);
              border: 1px solid var(--border);
            "
          />
        </div>

        <!-- Rating -->
        <div>
          <label
            class="block text-xs font-medium mb-1.5"
            style="color: var(--text-muted)"
            >Valoración</label
          >
          <StarRating v-model="rating" :size="22" />
        </div>

        <!-- Custom fields for the selected category -->
        <div v-for="field in selectedCategory?.fields" :key="field.id">
          <label
            class="block text-xs font-medium mb-1.5"
            style="color: var(--text-muted)"
            >{{ field.name }}</label
          >
          <input
            v-if="field.type === 'text'"
            v-model="customFields[field.id]"
            type="text"
            :placeholder="field.name"
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text);
              border: 1px solid var(--border);
            "
          />
          <input
            v-else-if="field.type === 'number'"
            v-model.number="customFields[field.id]"
            type="number"
            :placeholder="field.name"
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text);
              border: 1px solid var(--border);
            "
          />
          <input
            v-else-if="field.type === 'date'"
            v-model="customFields[field.id]"
            type="date"
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text);
              border: 1px solid var(--border);
            "
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 mt-2">
          <button
            type="submit"
            class="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer"
            :style="{ background: selectedCategory?.color ?? 'var(--text)' }"
          >
            {{ isEditing ? "Guardar cambios" : "Añadir" }}
          </button>
          <button
            v-if="isEditing"
            type="button"
            @click="handleDelete"
            class="p-2.5 rounded-lg transition-colors cursor-pointer"
            style="color: #ef4444; background: #ef444412"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </form>
    </div>
  </div>

  <ConfirmModal
    v-if="showDeleteConfirm"
    title="Eliminar elemento"
    :message="`¿Eliminar &quot;${title || 'este elemento'}&quot;? Esta acción no se puede deshacer.`"
    confirm-text="Eliminar"
    :danger="true"
    @confirm="confirmDelete"
    @cancel="showDeleteConfirm = false"
  />
</template>
