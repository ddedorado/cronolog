<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useCronologStore } from "@/stores/cronolog";
import type { Category, CategoryField } from "@/schemas/cronolog";
import { generateId, nextCategoryColor } from "@/utils/helpers";
import { X, Trash2, Plus } from "lucide-vue-next";
import ConfirmModal from "@/components/ConfirmModal.vue";
import type { FieldType, DataSource } from "@/schemas/cronolog";
import { useToast } from "@/composables/useToast";
import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
import { useDragToDismiss } from "@/composables/useDragToDismiss";

useBodyScrollLock();

const props = defineProps<{
  category: Category | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const store = useCronologStore();
const toast = useToast();

const isEditing = computed(() => props.category !== null);
const name = ref(props.category?.name ?? "");
const icon = ref(props.category?.icon ?? "folder");
const color = ref(
  props.category?.color ??
    nextCategoryColor(store.categories.map((c) => c.color)),
);
const fields = ref<CategoryField[]>([...(props.category?.fields ?? [])]);
const dataSource = ref<DataSource>(props.category?.dataSource ?? "none");

const availableIcons = [
  "clapperboard",
  "book-open",
  "tv",
  "gamepad-2",
  "music",
  "mic",
  "podcast",
  "palette",
  "drama",
  "puzzle",
  "dices",
  "map",
  "utensils",
  "camera",
  "headphones",
  "guitar",
  "ticket",
  "trophy",
];

const availableColors = [
  "#3B82F6",
  "#22C55E",
  "#EAB308",
  "#F97316",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#6366F1",
  "#F59E0B",
];

function addField() {
  fields.value.push({
    id: generateId(),
    name: "",
    type: "text" as FieldType,
    required: false,
  });
}

function removeField(id: string) {
  fields.value = fields.value.filter((f) => f.id !== id);
}

function handleSubmit() {
  if (!name.value.trim()) return;
  const validFields = fields.value.filter((f) => f.name.trim());

  if (isEditing.value && props.category) {
    store.updateCategory(props.category.id, {
      name: name.value.trim(),
      icon: icon.value,
      color: color.value,
      fields: validFields,
      dataSource: dataSource.value,
    });
  } else {
    const newCategory: Category = {
      id: generateId(),
      name: name.value.trim(),
      icon: icon.value,
      color: color.value,
      fields: validFields,
      order: store.categories.length,
      dataSource: dataSource.value,
    };
    store.addCategory(newCategory);
  }
  emit("close");
}

const showDeleteConfirm = ref(false);

const categoryItemCount = computed(() => {
  if (!props.category) return 0;
  return store.items.filter((i) => i.categoryId === props.category!.id).length;
});

function handleDelete() {
  if (!props.category) return;
  if (categoryItemCount.value === 0) {
    const restore = store.removeCategoryWithUndo(props.category.id);
    if (restore) {
      toast.success(`"${props.category.name}" eliminada`, {
        label: "Deshacer",
        handler: restore,
      });
    }
    emit("close");
  } else {
    showDeleteConfirm.value = true;
  }
}

function confirmDelete() {
  if (props.category) {
    const restore = store.removeCategoryWithUndo(props.category.id);
    if (restore) {
      toast.success(`"${props.category.name}" y sus items eliminados`, {
        label: "Deshacer",
        handler: restore,
      });
    }
  }
  showDeleteConfirm.value = false;
  emit("close");
}

function handleBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains("modal-backdrop")) {
    emit("close");
  }
}

const nameInput = ref<HTMLInputElement | null>(null);
onMounted(() => nameInput.value?.focus());

const { modalRef, dragStyle, onTouchStart, onTouchMove, onTouchEnd } =
  useDragToDismiss(() => emit("close"), { handleTopArea: 40 });
</script>

<template>
  <div
    class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    style="background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px)"
    @click="handleBackdropClick"
  >
    <div
      ref="modalRef"
      class="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl p-6 animate-scale-in"
      style="
        background: var(--bg-elevated);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        -webkit-overflow-scrolling: touch;
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
      <!-- Header -->
      <div class="flex items-center justify-between mb-5">
        <h2 class="font-display text-xl" style="color: var(--text)">
          {{ isEditing ? "Editar" : "Nueva" }} categoría
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
        <!-- Name -->
        <div>
          <label
            class="block text-xs font-medium mb-1.5"
            style="color: var(--text-muted)"
            >Nombre</label
          >
          <input
            ref="nameInput"
            v-model="name"
            type="text"
            required
            placeholder="Ej: Películas, Libros, Podcasts..."
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text);
              border: 1px solid var(--border);
            "
          />
        </div>

        <!-- Color -->
        <div>
          <label
            class="block text-xs font-medium mb-1.5"
            style="color: var(--text-muted)"
            >Color</label
          >
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="c in availableColors"
              :key="c"
              type="button"
              @click="color = c"
              class="w-7 h-7 rounded-full transition-transform cursor-pointer"
              :style="{
                background: c,
                transform: color === c ? 'scale(1.2)' : 'scale(1)',
                outline: color === c ? `2px solid ${c}` : 'none',
                outlineOffset: '2px',
              }"
            />
          </div>
        </div>

        <!-- Icon -->
        <div>
          <label
            class="block text-xs font-medium mb-1.5"
            style="color: var(--text-muted)"
            >Icono</label
          >
          <div class="flex gap-1.5 flex-wrap">
            <button
              v-for="ic in availableIcons"
              :key="ic"
              type="button"
              @click="icon = ic"
              class="px-2 py-1 rounded-md text-xs transition-colors cursor-pointer"
              :style="{
                background: icon === ic ? color + '20' : 'var(--bg-muted)',
                color: icon === ic ? color : 'var(--text-muted)',
                border:
                  icon === ic
                    ? `1px solid ${color}40`
                    : '1px solid transparent',
              }"
            >
              {{ ic }}
            </button>
          </div>
        </div>

        <!-- Data source -->
        <div>
          <label
            class="block text-xs font-medium mb-1.5"
            style="color: var(--text-muted)"
            >Fuente de datos</label
          >
          <select
            v-model="dataSource"
            class="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text);
              border: 1px solid var(--border);
            "
          >
            <option value="none">Ninguna</option>
            <option value="tmdb">TMDB — Películas / TV</option>
            <option value="googlebooks">Google Books — Libros</option>
            <option value="rawg">RAWG — Videojuegos</option>
            <option value="musicbrainz">MusicBrainz — Música</option>
            <option value="jikan">Jikan — Anime / Manga</option>
            <option value="comicvine">ComicVine — Cómics</option>
            <option value="openlibrary">Open Library — Libros (alt)</option>
          </select>
          <p class="text-[10px] mt-1" style="color: var(--text-faint)">
            Permite enriquecer automáticamente los elementos con imagen,
            sinopsis y más datos.
          </p>
        </div>

        <!-- Custom fields -->
        <div>
          <label
            class="block text-xs font-medium mb-1.5"
            style="color: var(--text-muted)"
          >
            Campos personalizados
          </label>
          <div class="flex flex-col gap-2">
            <div
              v-for="field in fields"
              :key="field.id"
              class="flex items-center gap-2"
            >
              <input
                v-model="field.name"
                type="text"
                placeholder="Nombre del campo"
                class="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                style="
                  background: var(--bg-muted);
                  color: var(--text);
                  border: 1px solid var(--border);
                "
              />
              <select
                v-model="field.type"
                class="px-2 py-1.5 rounded-lg text-xs outline-none"
                style="
                  background: var(--bg-muted);
                  color: var(--text);
                  border: 1px solid var(--border);
                "
              >
                <option value="text">Texto</option>
                <option value="number">Número</option>
                <option value="date">Fecha</option>
              </select>
              <button
                type="button"
                @click="removeField(field.id)"
                class="p-1 rounded-md cursor-pointer"
                style="color: #ef4444"
              >
                <Trash2 :size="14" />
              </button>
            </div>
            <button
              type="button"
              @click="addField"
              class="flex items-center gap-1 text-xs py-1.5 cursor-pointer"
              :style="{ color }"
            >
              <Plus :size="14" />
              Añadir campo
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 mt-2">
          <button
            type="submit"
            class="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer"
            :style="{ background: color }"
          >
            {{ isEditing ? "Guardar cambios" : "Crear categoría" }}
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

    <!-- Delete confirm modal -->
    <ConfirmModal
      v-if="showDeleteConfirm && category"
      :title="`Eliminar ${category.name}`"
      :message="`Se eliminarán ${categoryItemCount} elemento${categoryItemCount !== 1 ? 's' : ''} de esta categoría. Esta acción no se puede deshacer.`"
      confirm-text="Eliminar categoría"
      :danger="true"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>
