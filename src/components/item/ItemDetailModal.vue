<script setup lang="ts">
import type { Item, Category } from "@/schemas/cronolog";
import { formatDate } from "@/utils/helpers";
import { useSettingsStore } from "@/stores/settings";
import { useCronologStore } from "@/stores/cronolog";
import { useEnrichmentQueue } from "@/composables/useEnrichmentQueue";
import {
  X,
  Pencil,
  Sparkles,
  Calendar,
  Tag,
  Loader2,
  Heart,
  StickyNote,
} from "lucide-vue-next";
import StarRating from "@/components/StarRating.vue";
import { ref, computed } from "vue";

const props = defineProps<{
  item: Item;
  category: Category;
}>();

const emit = defineEmits<{
  close: [];
  edit: [];
}>();

const settings = useSettingsStore();
const store = useCronologStore();
const { enqueueItem, queue } = useEnrichmentQueue();

const imgError = ref(false);

const enrichment = computed(() => props.item.enrichmentData);
const isEnriching = computed(() =>
  queue.value.some(
    (t) =>
      t.itemId === props.item.id &&
      (t.status === "running" || t.status === "pending"),
  ),
);

const canEnrich = computed(() => {
  return (
    props.category.dataSource !== "none" &&
    settings.hasKeyForSource(props.category.dataSource)
  );
});

const extraEntries = computed(() => {
  if (!enrichment.value?.extra) return [];
  const labels: Record<string, string> = {
    director: "Director",
    cast: "Reparto",
    runtime: "Duración",
    voteAverage: "Puntuación",
    seasons: "Temporadas",
    episodes: "Episodios",
    status: "Estado",
    author: "Autor",
    pages: "Páginas",
    publisher: "Editorial",
    isbn: "ISBN",
    platforms: "Plataformas",
    metacritic: "Metacritic",
    playtime: "Horas de juego",
    developers: "Desarrollador",
    publishers: "Distribuidor",
  };
  return Object.entries(enrichment.value.extra)
    .filter(
      ([, v]) =>
        v !== null &&
        v !== undefined &&
        v !== "" &&
        !(Array.isArray(v) && v.length === 0),
    )
    .map(([k, v]) => ({
      label: labels[k] ?? k,
      value: Array.isArray(v) ? v.join(", ") : String(v),
    }));
});

function handleEnrich() {
  enqueueItem(props.item, props.category);
}

function toggleFavorite() {
  store.updateItem(props.item.id, { favorite: !props.item.favorite });
}

function handleBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains("modal-backdrop")) {
    emit("close");
  }
}

// Drag-to-dismiss on mobile
const dragStartY = ref(0);
const dragOffset = ref(0);
const isDragging = ref(false);
const modalRef = ref<HTMLElement | null>(null);

function onDragStart(e: TouchEvent) {
  // Only allow drag from top area (handle zone)
  const el = modalRef.value;
  if (!el) return;
  const scrollTop = el.scrollTop;
  if (scrollTop > 0) return; // don't drag when scrolled
  dragStartY.value = e.touches[0].clientY;
  isDragging.value = true;
}

function onDragMove(e: TouchEvent) {
  if (!isDragging.value) return;
  const dy = e.touches[0].clientY - dragStartY.value;
  if (dy > 0) {
    dragOffset.value = dy;
  }
}

function onDragEnd() {
  if (!isDragging.value) return;
  isDragging.value = false;
  if (dragOffset.value > 100) {
    emit("close");
  }
  dragOffset.value = 0;
}
</script>

<template>
  <div
    class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    style="background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px)"
    @click="handleBackdropClick"
  >
    <div
      ref="modalRef"
      class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl animate-scale-in"
      style="
        background: var(--bg-elevated);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        -webkit-overflow-scrolling: touch;
      "
      :style="{
        transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        opacity: dragOffset > 0 ? Math.max(0.5, 1 - dragOffset / 300) : 1,
      }"
      @touchstart="onDragStart"
      @touchmove="onDragMove"
      @touchend="onDragEnd"
    >
      <!-- Image header -->
      <div
        v-if="item.imageUrl && !imgError"
        class="relative w-full h-56 overflow-hidden rounded-t-xl"
      >
        <img
          :src="item.imageUrl"
          :alt="item.title"
          class="w-full h-full object-cover"
          @error="imgError = true"
        />
        <div
          class="absolute inset-0"
          style="
            background: linear-gradient(
              to bottom,
              transparent 40%,
              var(--bg-elevated)
            );
          "
        />
        <button
          @click="emit('close')"
          class="absolute top-3 right-3 p-1.5 rounded-full cursor-pointer"
          style="background: rgba(0, 0, 0, 0.5); color: white"
        >
          <X :size="16" />
        </button>
      </div>

      <div
        class="p-5"
        :class="{ '-mt-8 relative z-10': item.imageUrl && !imgError }"
      >
        <!-- Close button when no image -->
        <div v-if="!item.imageUrl || imgError" class="flex justify-end mb-2">
          <button
            @click="emit('close')"
            class="p-1 rounded-md cursor-pointer"
            style="color: var(--text-faint)"
          >
            <X :size="18" />
          </button>
        </div>

        <!-- Title + year -->
        <h2
          class="font-display text-2xl leading-tight"
          style="color: var(--text)"
        >
          {{ item.title }}
        </h2>
        <div class="flex items-center gap-3 mt-1.5">
          <span
            v-if="item.releaseYear"
            class="text-sm font-mono"
            style="color: var(--text-faint)"
          >
            {{ item.releaseYear }}
          </span>
          <span
            class="text-xs px-2 py-0.5 rounded-md"
            :style="{
              background: category.color + '15',
              color: category.color,
            }"
          >
            {{ category.name }}
          </span>
        </div>

        <!-- Rating + Favorite -->
        <div class="flex items-center gap-3 mt-3">
          <div v-if="item.rating && item.rating > 0" class="flex-1">
            <StarRating
              :model-value="item.rating"
              :readonly="true"
              :size="18"
            />
          </div>
          <button
            @click="toggleFavorite"
            class="p-1.5 rounded-lg cursor-pointer transition-colors"
            :style="{
              background: item.favorite ? '#ef444415' : 'var(--bg-muted)',
              color: item.favorite ? '#ef4444' : 'var(--text-faint)',
            }"
            :title="
              item.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'
            "
          >
            <Heart :size="16" :fill="item.favorite ? 'currentColor' : 'none'" />
          </button>
        </div>

        <!-- Status badge -->
        <div v-if="item.status && item.status !== 'completed'" class="mt-2">
          <span
            class="text-[10px] px-2 py-0.5 rounded-full font-medium"
            :style="{
              background:
                item.status === 'in-progress' ? '#f59e0b15' : '#6366f115',
              color: item.status === 'in-progress' ? '#f59e0b' : '#6366f1',
            }"
          >
            {{ item.status === "in-progress" ? "En progreso" : "Pendiente" }}
          </span>
        </div>

        <!-- Consumed date -->
        <p
          v-if="item.consumedDate"
          class="flex items-center gap-1.5 text-xs mt-3"
          style="color: var(--text-muted)"
        >
          <Calendar :size="13" />
          {{ formatDate(item.consumedDate) }}
        </p>

        <!-- Genres -->
        <div
          v-if="enrichment?.genres?.length"
          class="flex flex-wrap gap-1.5 mt-3"
        >
          <span
            v-for="genre in enrichment.genres"
            :key="genre"
            class="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style="
              background: var(--bg-muted);
              color: var(--text-muted);
              border: 1px solid var(--border);
            "
          >
            <Tag :size="10" />
            {{ genre }}
          </span>
        </div>

        <!-- Synopsis -->
        <p
          v-if="enrichment?.synopsis"
          class="text-sm leading-relaxed mt-4"
          style="color: var(--text-muted)"
        >
          {{ enrichment.synopsis }}
        </p>

        <!-- Extra fields -->
        <div
          v-if="extraEntries.length > 0"
          class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2"
        >
          <div v-for="entry in extraEntries" :key="entry.label">
            <p
              class="text-[10px] font-medium uppercase tracking-wide"
              style="color: var(--text-faint)"
            >
              {{ entry.label }}
            </p>
            <p class="text-xs mt-0.5" style="color: var(--text)">
              {{ entry.value }}
            </p>
          </div>
        </div>

        <!-- Custom fields -->
        <div
          v-if="Object.keys(item.customFields).length > 0"
          class="mt-4 pt-3"
          style="border-top: 1px solid var(--border)"
        >
          <div
            v-for="(value, key) in item.customFields"
            :key="key"
            class="text-xs mt-1"
            style="color: var(--text-muted)"
          >
            <span class="font-medium" :style="{ color: category.color }">
              {{ key }}:
            </span>
            {{ value }}
          </div>
        </div>

        <!-- No enrichment CTA -->
        <div
          v-if="!enrichment && canEnrich"
          class="mt-5 p-3 rounded-lg text-center"
          style="background: var(--bg-muted); border: 1px dashed var(--border)"
        >
          <p class="text-xs" style="color: var(--text-muted)">
            Enriquece esta entrada para obtener imagen, sinopsis y más datos
          </p>
          <button
            @click="handleEnrich"
            class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style="background: var(--text); color: var(--bg)"
            :disabled="isEnriching"
          >
            <Loader2 v-if="isEnriching" :size="13" class="animate-spin" />
            <Sparkles v-else :size="13" />
            {{ isEnriching ? "Enriqueciendo..." : "Enriquecer" }}
          </button>
        </div>

        <!-- Notes -->
        <div
          v-if="item.notes"
          class="mt-4 p-3 rounded-lg"
          style="background: var(--bg-muted); border: 1px solid var(--border)"
        >
          <div class="flex items-center gap-1.5 mb-1.5">
            <StickyNote :size="12" style="color: var(--text-faint)" />
            <span
              class="text-[10px] uppercase tracking-wider"
              style="color: var(--text-faint)"
              >Notas</span
            >
          </div>
          <p
            class="text-xs leading-relaxed whitespace-pre-wrap"
            style="color: var(--text-muted)"
          >
            {{ item.notes }}
          </p>
        </div>

        <!-- Tags -->
        <div v-if="item.tags?.length" class="flex flex-wrap gap-1.5 mt-3">
          <span
            v-for="tag in item.tags"
            :key="tag"
            class="text-[10px] px-2 py-0.5 rounded-full"
            style="
              background: var(--bg-muted);
              color: var(--text-muted);
              border: 1px solid var(--border);
            "
          >
            #{{ tag }}
          </span>
        </div>

        <!-- Actions -->
        <div
          class="flex items-center gap-2 mt-5 pt-4"
          style="border-top: 1px solid var(--border)"
        >
          <button
            @click="emit('edit')"
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
            :style="{
              background: category.color + '12',
              color: category.color,
            }"
          >
            <Pencil :size="14" />
            Editar
          </button>
          <button
            v-if="canEnrich"
            @click="handleEnrich"
            class="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text-muted);
              border: 1px solid var(--border);
            "
            :disabled="isEnriching"
          >
            <Loader2 v-if="isEnriching" :size="14" class="animate-spin" />
            <Sparkles v-else :size="14" />
            {{ enrichment ? "Re-enriquecer" : "Enriquecer" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
