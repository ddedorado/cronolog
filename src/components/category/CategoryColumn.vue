<script setup lang="ts">
import type { Category, Item } from "@/schemas/cronolog";
import { useCronologStore } from "@/stores/cronolog";
import { useSwipeActions } from "@/composables/useSwipeActions";
import ItemCard from "@/components/item/ItemCard.vue";
import DynamicIcon from "@/components/DynamicIcon.vue";
import {
  Plus,
  Settings,
  GripVertical,
  ArrowUpDown,
  Pencil,
  Trash2,
  CheckCircle,
} from "lucide-vue-next";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSortable } from "@/composables/useSortable";

const props = defineProps<{
  category: Category;
  items: Item[];
  compact?: boolean;
  highlightItemId?: string | null;
  wishlistMode?: boolean;
}>();

const emit = defineEmits<{
  addItem: [];
  editItem: [item: Item];
  editItemForm: [item: Item];
  editCategory: [];
  markConsumed: [item: Item];
}>();

const store = useCronologStore();
const {
  swipedItemId,
  swipeOffset,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  resetSwipe,
} = useSwipeActions();
const listRef = ref<HTMLElement | null>(null);
const sortMode = ref<
  "manual" | "rating-desc" | "rating-asc" | "date-desc" | "date-asc" | "alpha"
>("manual");
const showSortMenu = ref(false);
const sortMenuRef = ref<HTMLElement | null>(null);

// Close sort menu on outside click (mobile-friendly)
function handleDocClick(e: MouseEvent) {
  if (
    showSortMenu.value &&
    sortMenuRef.value &&
    !sortMenuRef.value.contains(e.target as Node)
  ) {
    showSortMenu.value = false;
  }
}
onMounted(() => document.addEventListener("click", handleDocClick, true));
onUnmounted(() => document.removeEventListener("click", handleDocClick, true));

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
        <div class="relative" ref="sortMenuRef">
          <button
            @click="showSortMenu = !showSortMenu"
            class="p-1 rounded-md transition-colors cursor-pointer sm:opacity-0 sm:group-hover:opacity-100"
            :style="{
              color:
                sortMode !== 'manual' ? category.color : 'var(--text-faint)',
            }"
            title="Ordenar"
          >
            <ArrowUpDown :size="13" />
          </button>
          <!-- Mobile backdrop for sort menu -->
          <div
            v-if="showSortMenu"
            class="sm:hidden fixed inset-0 z-[99]"
            style="background: rgba(0, 0, 0, 0.3)"
            @click="showSortMenu = false"
          />
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
              class="fixed left-2 right-2 bottom-2 z-[100] sm:absolute sm:right-0 sm:left-auto sm:bottom-auto sm:top-full sm:mt-1 py-1 rounded-lg min-w-[140px]"
              style="
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                box-shadow: var(--shadow-card-hover);
              "
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
                class="w-full text-left px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm sm:text-xs cursor-pointer transition-colors"
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
          class="p-1.5 rounded-md transition-colors cursor-pointer"
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
            class="flex items-center justify-center w-6 flex-shrink-0 cursor-grab rounded-l-lg opacity-40 sm:opacity-0 sm:group-hover:opacity-40 hover:!opacity-100 transition-opacity touch-none select-none"
            :class="{
              '!opacity-60 cursor-grabbing':
                isDragging && getOriginalIndex(item.id) === dragIndex,
            }"
            style="color: var(--text-faint)"
            @pointerdown="onPointerDown($event, getOriginalIndex(item.id))"
          >
            <GripVertical :size="14" />
          </div>

          <!-- Swipe wrapper (mobile) -->
          <div
            class="flex-1 min-w-0 relative overflow-hidden sm:overflow-visible"
          >
            <!-- Swipe action buttons behind -->
            <div
              v-if="swipedItemId === item.id"
              class="absolute right-0 top-0 bottom-0 flex items-stretch z-10"
            >
              <button
                v-if="props.wishlistMode"
                @click.stop="
                  resetSwipe();
                  emit('markConsumed', item);
                "
                class="w-20 flex items-center justify-center cursor-pointer"
                style="background: #22c55e"
              >
                <CheckCircle :size="16" style="color: white" />
              </button>
              <button
                @click.stop="
                  resetSwipe();
                  emit('editItemForm', item);
                "
                class="w-20 flex items-center justify-center cursor-pointer"
                :style="{ background: props.category.color }"
              >
                <Pencil :size="16" style="color: white" />
              </button>
              <button
                @click.stop="
                  resetSwipe();
                  store.removeItemWithUndo(item.id);
                "
                class="w-20 flex items-center justify-center cursor-pointer"
                style="background: var(--danger)"
              >
                <Trash2 :size="16" style="color: white" />
              </button>
            </div>

            <!-- Card content with swipe transform -->
            <div
              :style="{
                transform:
                  swipedItemId === item.id
                    ? `translateX(${swipeOffset}px)`
                    : 'none',
                transition:
                  swipedItemId === item.id ? 'none' : 'transform 0.2s ease-out',
              }"
              @touchstart="onTouchStart($event, item.id)"
              @touchmove="onTouchMove($event)"
              @touchend="onTouchEnd()"
              @click="emit('editItem', item)"
            >
              <!-- Compact view -->
              <div
                v-if="compact"
                class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors compact-item"
                style="background: var(--bg-elevated)"
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
              <ItemCard v-else :item="item" :category="category" :wishlist-mode="props.wishlistMode" />
            </div>
          </div>
        </div>
      </div>

      <!-- Add button -->
      <button
        @click="emit('addItem')"
        class="add-item-btn flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs transition-all duration-200 cursor-pointer mt-auto"
        style="color: var(--text-faint); border: 1px dashed var(--border)"
        :data-color="category.color"
      >
        <Plus :size="14" />
        Añadir
      </button>
    </div>
  </div>
</template>

<style scoped>
@media (hover: hover) {
  .compact-item:hover {
    background: var(--bg-muted) !important;
  }
  .add-item-btn:hover {
    border-color: var(--text-muted) !important;
    color: var(--text-muted) !important;
  }
}
.compact-item:active {
  background: var(--bg-muted) !important;
}
.add-item-btn:active {
  border-color: var(--text-muted) !important;
  color: var(--text-muted) !important;
}
</style>
