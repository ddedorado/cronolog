<script setup lang="ts">
import type { Category, Item } from "@/schemas/cronolog";
import { useCronologStore } from "@/stores/cronolog";
import ItemCard from "@/components/item/ItemCard.vue";
import DynamicIcon from "@/components/DynamicIcon.vue";
import { Plus, Settings, GripVertical, ArrowUpDown } from "lucide-vue-next";
import { ref, computed } from "vue";
import { useSortable } from "@/composables/useSortable";

const props = defineProps<{
  category: Category;
  items: Item[];
  compact?: boolean;
  highlightItemId?: string | null;
}>();

const emit = defineEmits<{
  addItem: [];
  editItem: [item: Item];
  editCategory: [];
}>();

const store = useCronologStore();
const listRef = ref<HTMLElement | null>(null);
const sortMode = ref<
  "manual" | "rating-desc" | "rating-asc" | "date-desc" | "date-asc" | "alpha"
>("manual");
const showSortMenu = ref(false);

const sortedItems = computed(() => {
  const list = [...props.items];
  switch (sortMode.value) {
    case "rating-desc":
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case "rating-asc":
      return list.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
    case "date-desc":
      return list.sort((a, b) =>
        (b.consumedDate ?? "").localeCompare(a.consumedDate ?? ""),
      );
    case "date-asc":
      return list.sort((a, b) =>
        (a.consumedDate ?? "").localeCompare(b.consumedDate ?? ""),
      );
    case "alpha":
      return list.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return list; // manual order (already sorted by store)
  }
});

const itemIds = computed(() => sortedItems.value.map((i) => i.id));

const { dragIndex, isDragging, previewIds, onPointerDown } = useSortable(
  listRef,
  itemIds,
  {
    onReorder: (orderedIds) => {
      store.reorderCategoryItems(props.category.id, orderedIds);
    },
  },
);

// Map of id -> item for fast lookup
const itemMap = computed(() => {
  const map = new Map<string, Item>();
  for (const item of sortedItems.value) {
    map.set(item.id, item);
  }
  return map;
});

// Items in preview order (live reorder during drag)
const displayItems = computed(() => {
  return previewIds.value
    .map((id) => itemMap.value.get(id))
    .filter((item): item is Item => item !== undefined);
});

function getOriginalIndex(itemId: string): number {
  return itemIds.value.indexOf(itemId);
}
</script>

<template>
  <div class="group flex flex-col animate-fade-in">
    <!-- Column header -->
    <div
      class="flex items-center justify-between px-3 py-2.5 rounded-t-xl"
      :style="{
        background: category.color + '12',
        borderBottom: `2px solid ${category.color}`,
      }"
    >
      <div class="flex items-center gap-2">
        <DynamicIcon
          :name="category.icon"
          :size="16"
          :style="{ color: category.color }"
        />
        <span class="font-medium text-sm" style="color: var(--text)">{{
          category.name
        }}</span>
        <span
          class="text-xs font-mono px-1.5 py-0.5 rounded-md"
          :style="{ background: category.color + '18', color: category.color }"
        >
          {{ items.length }}
        </span>
      </div>
      <div class="flex items-center gap-0.5">
        <div class="relative">
          <button
            @click="showSortMenu = !showSortMenu"
            class="p-1 rounded-md transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
            :style="{
              color:
                sortMode !== 'manual' ? category.color : 'var(--text-faint)',
            }"
            title="Ordenar"
          >
            <ArrowUpDown :size="13" />
          </button>
          <Transition
            enter-active-class="transition-all duration-150"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-100"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="showSortMenu"
              class="absolute right-0 top-full mt-1 z-20 py-1 rounded-lg min-w-[140px]"
              style="
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                box-shadow: var(--shadow-card-hover);
              "
              @mouseleave="showSortMenu = false"
            >
              <button
                v-for="opt in [
                  { key: 'manual', label: 'Manual' },
                  { key: 'rating-desc', label: 'Rating ↓' },
                  { key: 'rating-asc', label: 'Rating ↑' },
                  { key: 'date-desc', label: 'Fecha ↓' },
                  { key: 'date-asc', label: 'Fecha ↑' },
                  { key: 'alpha', label: 'A → Z' },
                ]"
                :key="opt.key"
                @click="
                  sortMode = opt.key as any;
                  showSortMenu = false;
                "
                class="w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors"
                :style="{
                  color:
                    sortMode === opt.key ? category.color : 'var(--text-muted)',
                  fontWeight: sortMode === opt.key ? '600' : '400',
                  background:
                    sortMode === opt.key
                      ? category.color + '10'
                      : 'transparent',
                }"
              >
                {{ opt.label }}
              </button>
            </div>
          </Transition>
        </div>
        <button
          @click="emit('editCategory')"
          class="p-1 rounded-md transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
          style="color: var(--text-faint)"
          title="Editar categoría"
        >
          <Settings :size="14" />
        </button>
      </div>
    </div>

    <!-- Items list -->
    <div
      ref="listRef"
      class="flex-1 flex flex-col gap-2 pt-3 pb-2 min-h-[120px]"
    >
      <!-- Empty state -->
      <div
        v-if="displayItems.length === 0"
        class="flex flex-col items-center justify-center py-8 px-4 text-center"
      >
        <DynamicIcon
          :name="category.icon"
          :size="28"
          :style="{ color: category.color, opacity: 0.3 }"
        />
        <p class="text-xs mt-2" style="color: var(--text-faint)">
          Sin registros aún
        </p>
      </div>

      <div
        v-for="(item, i) in displayItems"
        :key="item.id"
        :data-sortable-id="item.id"
        class="relative transition-transform duration-200 ease-out"
        :class="{
          'animate-slide-up': !isDragging && props.highlightItemId !== item.id,
          'animate-pop-in': props.highlightItemId === item.id,
          'opacity-15': isDragging && getOriginalIndex(item.id) === dragIndex,
        }"
        :style="{
          animationDelay: isDragging ? '0ms' : `${i * 50}ms`,
        }"
      >
        <div class="flex items-stretch gap-0">
          <!-- Drag handle -->
          <div
            class="flex items-center justify-center w-6 flex-shrink-0 cursor-grab rounded-l-lg opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity touch-none select-none"
            :class="{
              '!opacity-60 cursor-grabbing':
                isDragging && getOriginalIndex(item.id) === dragIndex,
            }"
            style="color: var(--text-faint)"
            @pointerdown="onPointerDown($event, getOriginalIndex(item.id))"
          >
            <GripVertical :size="14" />
          </div>

          <!-- Card -->
          <div class="flex-1 min-w-0" @click="emit('editItem', item)">
            <!-- Compact view -->
            <div
              v-if="compact"
              class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              style="background: var(--bg-elevated)"
              @mouseenter="
                ($event.currentTarget as HTMLElement).style.background =
                  'var(--bg-muted)'
              "
              @mouseleave="
                ($event.currentTarget as HTMLElement).style.background =
                  'var(--bg-elevated)'
              "
            >
              <span
                class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                :style="{ background: category.color }"
              />
              <span
                class="text-xs truncate flex-1"
                style="color: var(--text)"
                :title="item.title"
              >
                {{ item.title }}
              </span>
              <span
                v-if="item.releaseYear"
                class="text-[10px] font-mono flex-shrink-0"
                style="color: var(--text-faint)"
              >
                {{ item.releaseYear }}
              </span>
              <span
                v-if="item.rating && item.rating > 0"
                class="text-[10px] flex-shrink-0"
                style="color: var(--star)"
              >
                ★ {{ item.rating }}
              </span>
            </div>
            <!-- Full view -->
            <ItemCard v-else :item="item" :category="category" />
          </div>
        </div>
      </div>

      <!-- Add button -->
      <button
        @click="emit('addItem')"
        class="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-all duration-200 cursor-pointer mt-auto"
        style="color: var(--text-faint); border: 1px dashed var(--border)"
        @mouseenter="
          ($event.target as HTMLElement).style.borderColor = category.color;
          ($event.target as HTMLElement).style.color = category.color;
        "
        @mouseleave="
          ($event.target as HTMLElement).style.borderColor = 'var(--border)';
          ($event.target as HTMLElement).style.color = 'var(--text-faint)';
        "
      >
        <Plus :size="14" />
        Añadir
      </button>
    </div>
  </div>
</template>
