<script setup lang="ts">
import { useCronologStore } from "@/stores/cronolog";
import { useSettingsStore } from "@/stores/settings";
import { useTheme } from "@/composables/useTheme";
import { useEnrichmentQueue } from "@/composables/useEnrichmentQueue";
import { usePullToRefresh } from "@/composables/usePullToRefresh";
import { useSupabaseSync } from "@/composables/useSupabaseSync";
import AppHeader from "@/components/AppHeader.vue";
import MobileNav from "@/components/MobileNav.vue";
import YearSelector from "@/components/year/YearSelector.vue";
import CategoryColumn from "@/components/category/CategoryColumn.vue";
import YearStats from "@/components/stats/YearStats.vue";
import EnrichmentToast from "@/components/EnrichmentToast.vue";
import SpotlightSearch from "@/components/SpotlightSearch.vue";
// FloatingAddButton removed — user preference
import CategoryTabs from "@/components/category/CategoryTabs.vue";
import ExpandedStats from "@/components/stats/ExpandedStats.vue";
import ActivityTimeline from "@/components/ActivityTimeline.vue";
import StarRating from "@/components/StarRating.vue";
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  defineAsyncComponent,
} from "vue";
import type { Item, Category } from "@/schemas/cronolog";
import { CORE_CATEGORY_IDS } from "@/schemas/cronolog";
import {
  Plus,
  CalendarPlus,
  FolderPlus,
  LayoutGrid,
  List,
  Table2,
  BarChart3,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-vue-next";

// Lazy-load modals (not needed until user interaction)
const ItemFormModal = defineAsyncComponent(
  () => import("@/components/item/ItemFormModal.vue"),
);
const ItemDetailModal = defineAsyncComponent(
  () => import("@/components/item/ItemDetailModal.vue"),
);
const CategoryFormModal = defineAsyncComponent(
  () => import("@/components/category/CategoryFormModal.vue"),
);
import SettingsModal from "@/components/SettingsModal.vue";
const TableView = defineAsyncComponent(
  () => import("@/components/TableView.vue"),
);
const KeyboardShortcuts = defineAsyncComponent(
  () => import("@/components/KeyboardShortcuts.vue"),
);
const ImportModal = defineAsyncComponent(
  () => import("@/components/ImportModalV2.vue"),
);
const ExportModal = defineAsyncComponent(
  () => import("@/components/ExportModal.vue"),
);
const OnboardingV2 = defineAsyncComponent(
  () => import("@/components/OnboardingV2.vue"),
);

const store = useCronologStore();
const settingsStore = useSettingsStore();
const { isDark, toggleDark } = useTheme();
const { enqueueItem } = useEnrichmentQueue();
const { loadFromCloud } = useSupabaseSync();

// Search
const searchQuery = ref("");

// View mode: 'grid' | 'compact' | 'table' | 'stats' | 'timeline'
const viewMode = ref<"grid" | "compact" | "table" | "stats" | "timeline">(
  "grid",
);
const compactView = computed(() => viewMode.value === "compact");

// Spotlight search
const showSpotlight = ref(false);

// Keyboard shortcuts help
const showShortcuts = ref(false);

// Import modal
const showImportModal = ref(false);

// Export modal
const showExportModal = ref(false);

// Category filter (mobile tabs)
const activeCategoryFilter = ref<string | null>(null);

// Onboarding
const showOnboarding = ref(false);

function checkOnboarding() {
  const hasItems = store.items.length > 0;
  const dismissed = localStorage.getItem("cronolog_onboarding_v2_done");
  if (!hasItems && !dismissed && store.hasYears) {
    showOnboarding.value = true;
  }
}

// Re-evaluate onboarding when items or years change (e.g. after deletes)
watch([() => store.items.length, () => store.hasYears], () =>
  checkOnboarding(),
);

function dismissOnboarding() {
  showOnboarding.value = false;
  localStorage.setItem("cronolog_onboarding_v2_done", "1");
}

// Pull-to-refresh
const { pullDistance, refreshing, threshold } = usePullToRefresh(async () => {
  await loadFromCloud();
});

// Apply accent color on mount
onMounted(() => {
  document.documentElement.style.setProperty(
    "--accent",
    settingsStore.accentColor,
  );
});

// Year transition direction
const yearTransition = ref("slide-right");
const previousYear = ref(store.activeYear);
watch(
  () => store.activeYear,
  (newYear, oldYear) => {
    yearTransition.value = newYear > oldYear ? "slide-left" : "slide-right";
    previousYear.value = newYear;
  },
);

// Reset view mode when switching to wishlist (stats/timeline not available)
watch(
  () => store.isWishlistMode,
  (isWishlist) => {
    if (isWishlist && (viewMode.value === 'stats' || viewMode.value === 'timeline')) {
      viewMode.value = 'grid';
    }
  },
);

// Filter items by search (memoized per render via computed Map)
const filteredItemsMap = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const map = new Map<string, Item[]>();
  for (const cat of store.sortedCategories) {
    const items = store.isWishlistMode
      ? store.wishlistItemsForCategory(cat.id)
      : store.itemsForCategory(cat.id);
    if (!q) {
      map.set(cat.id, items);
    } else {
      map.set(
        cat.id,
        items.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            (i.releaseYear && String(i.releaseYear).includes(q)) ||
            Object.values(i.customFields).some((v) =>
              String(v).toLowerCase().includes(q),
            ),
        ),
      );
    }
  }
  return map;
});

function filteredItemsForCategory(categoryId: string) {
  return filteredItemsMap.value.get(categoryId) ?? [];
}

// Filter categories: by tab + hide empty when searching
const filteredCategories = computed(() => {
  let cats = store.sortedCategories;
  if (activeCategoryFilter.value) {
    cats = cats.filter((c) => c.id === activeCategoryFilter.value);
  }
  // When searching, hide categories with no matching items
  if (searchQuery.value.trim()) {
    cats = cats.filter((c) => filteredItemsForCategory(c.id).length > 0);
  } else if (store.isWishlistMode) {
    // In wishlist mode, show core categories + any with wishlist items
    cats = cats.filter(
      (c) => CORE_CATEGORY_IDS.has(c.id) || store.wishlistItemsForCategory(c.id).length > 0,
    );
  } else {
    // Hide non-core categories that have no items for the active year
    cats = cats.filter(
      (c) => CORE_CATEGORY_IDS.has(c.id) || store.itemsForCategory(c.id).length > 0,
    );
  }
  return cats;
});

// Item modal state
const showItemModal = ref(false);
const editingItem = ref<Item | null>(null);
const preselectedCategoryId = ref<string | null>(null);
const itemModalKey = ref(0);
const recentlyAddedItemId = ref<string | null>(null);

// Detail modal state
const showDetailModal = ref(false);
const detailItemId = ref<string | null>(null);
const detailItem = computed(() =>
  detailItemId.value
    ? (store.items.find((i) => i.id === detailItemId.value) ?? null)
    : null,
);
const detailCategory = computed(() =>
  detailItem.value
    ? (store.categories.find((c) => c.id === detailItem.value!.categoryId) ??
      null)
    : null,
);

// Settings modal
const showSettingsModal = ref(false);

function openAddItem(categoryId: string) {
  preselectedCategoryId.value = categoryId;
  editingItem.value = null;
  itemModalKey.value++;
  showItemModal.value = true;
}

function openEditItem(item: Item) {
  preselectedCategoryId.value = item.categoryId;
  editingItem.value = { ...item };
  itemModalKey.value++;
  showItemModal.value = true;
}

function openDetailItem(item: Item) {
  const category = store.categories.find((c) => c.id === item.categoryId);
  if (!category) return;
  detailItemId.value = item.id;
  showDetailModal.value = true;
}

function onDetailEdit() {
  if (detailItem.value) {
    showDetailModal.value = false;
    openEditItem(detailItem.value);
  }
}

function onItemModalClose() {
  showItemModal.value = false;

  // Auto-enrich newly created items
  if (!editingItem.value && settingsStore.autoEnrich) {
    const cat = store.categories.find(
      (c) => c.id === preselectedCategoryId.value,
    );
    if (
      cat &&
      cat.dataSource !== "none" &&
      settingsStore.hasKeyForSource(cat.dataSource)
    ) {
      const itemList = store.isWishlistMode
        ? store.wishlistItemsForCategory(cat.id)
        : store.itemsForCategory(cat.id);
      const latest = [...itemList].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )[0];
      if (latest && !latest.enrichmentData) {
        enqueueItem(latest, cat);
      }
    }
  }

  // Track recently added for pop animation
  if (!editingItem.value) {
    const itemList = store.isWishlistMode
      ? store.wishlistItemsForCategory(preselectedCategoryId.value ?? "")
      : store.itemsForCategory(preselectedCategoryId.value ?? "");
    const latest = [...itemList].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )[0];
    if (latest) {
      recentlyAddedItemId.value = latest.id;
      setTimeout(() => {
        recentlyAddedItemId.value = null;
      }, 500);
    }
  }
}

// Category modal state
const showCategoryModal = ref(false);
const editingCategory = ref<Category | null>(null);
const categoryModalKey = ref(0);

// Mark as consumed modal state (wishlist → cronolog)
const showConsumedModal = ref(false);
const consumedItem = ref<Item | null>(null);
const consumedRating = ref(0);
const consumedYear = ref(new Date().getFullYear());
const consumedDate = ref(new Date().toISOString().split('T')[0]);

function openMarkConsumed(item: Item) {
  consumedItem.value = item;
  consumedRating.value = 0;
  consumedYear.value = new Date().getFullYear();
  consumedDate.value = new Date().toISOString().split('T')[0];
  showConsumedModal.value = true;
}

function confirmMarkConsumed() {
  if (!consumedItem.value) return;
  store.markAsConsumed(consumedItem.value.id, {
    year: consumedYear.value,
    rating: consumedRating.value,
    consumedDate: consumedDate.value,
  });
  showConsumedModal.value = false;
  consumedItem.value = null;
}

// Category drag reorder (desktop only)
const draggingCategoryId = ref<string | null>(null);
const isTouchDevice = ref(false);

function onCategoryDragStart(e: DragEvent, categoryId: string) {
  if (isTouchDevice.value) {
    e.preventDefault();
    return;
  }
  draggingCategoryId.value = categoryId;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
  }
}

function onCategoryDragOver(e: DragEvent, targetId: string) {
  if (!draggingCategoryId.value || draggingCategoryId.value === targetId)
    return;
  const ids = store.sortedCategories.map((c) => c.id);
  const fromIdx = ids.indexOf(draggingCategoryId.value);
  const toIdx = ids.indexOf(targetId);
  if (fromIdx === -1 || toIdx === -1) return;
  const newIds = [...ids];
  newIds.splice(fromIdx, 1);
  newIds.splice(toIdx, 0, draggingCategoryId.value);
  store.reorderCategories(newIds);
}

function onCategoryDragEnd() {
  draggingCategoryId.value = null;
}

function openAddCategory() {
  editingCategory.value = null;
  categoryModalKey.value++;
  showCategoryModal.value = true;
}

function openEditCategory(category: Category) {
  editingCategory.value = { ...category, fields: [...category.fields] };
  categoryModalKey.value++;
  showCategoryModal.value = true;
}

// Keyboard shortcuts
function handleKeyboard(e: KeyboardEvent) {
  // Don't trigger when typing in inputs
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

  // Cmd/Ctrl+K opens spotlight
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    showSpotlight.value = !showSpotlight.value;
    return;
  }

  // Escape closes overlays
  if (e.key === "Escape") {
    if (showSpotlight.value) {
      showSpotlight.value = false;
      return;
    }
    if (showShortcuts.value) {
      showShortcuts.value = false;
      return;
    }
    return;
  }

  // Don't trigger other shortcuts when any modal is open
  if (
    showItemModal.value ||
    showDetailModal.value ||
    showCategoryModal.value ||
    showSettingsModal.value ||
    showSpotlight.value ||
    showShortcuts.value ||
    showImportModal.value ||
    showExportModal.value
  )
    return;

  if (e.key === "ArrowLeft") {
    const years = store.availableYears;
    const idx = years.indexOf(store.activeYear);
    if (idx > 0) store.setActiveYear(years[idx - 1]);
  } else if (e.key === "ArrowRight") {
    const years = store.availableYears;
    const idx = years.indexOf(store.activeYear);
    if (idx < years.length - 1) store.setActiveYear(years[idx + 1]);
  } else if (e.key === "n" || e.key === "N") {
    const firstCat = store.sortedCategories[0];
    if (firstCat) openAddItem(firstCat.id);
  } else if (e.key === "f" || e.key === "F") {
    showSpotlight.value = true;
  } else if (e.key === "s" || e.key === "S") {
    showSettingsModal.value = true;
  } else if (e.key === "?") {
    showShortcuts.value = true;
  } else if (e.key >= "1" && e.key <= "9") {
    const idx = parseInt(e.key) - 1;
    const cats = store.sortedCategories;
    if (idx < cats.length) {
      activeCategoryFilter.value =
        activeCategoryFilter.value === cats[idx].id ? null : cats[idx].id;
    }
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleKeyboard);
  checkOnboarding();
  const mq = window.matchMedia("(pointer: coarse)");
  isTouchDevice.value =
    mq.matches || "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const onChange = (e: MediaQueryListEvent) => {
    isTouchDevice.value = e.matches;
  };
  mq.addEventListener("change", onChange);
  onUnmounted(() => mq.removeEventListener("change", onChange));
});
onUnmounted(() => document.removeEventListener("keydown", handleKeyboard));
</script>

<template>
  <div
    class="min-h-screen pb-[calc(56px+env(safe-area-inset-bottom))] sm:pb-0"
    style="background: var(--bg)"
  >
    <!-- Pull-to-refresh indicator -->
    <div
      v-if="pullDistance > 0 || refreshing"
      class="fixed top-0 left-0 right-0 z-30 flex items-center justify-center pull-indicator"
      :style="{ transform: `translateY(${Math.min(pullDistance, 60)}px)` }"
    >
      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded-full mt-2"
        style="
          background: var(--bg-elevated);
          box-shadow: var(--shadow-card);
          border: 1px solid var(--border);
        "
      >
        <Loader2
          v-if="refreshing"
          :size="14"
          class="animate-spin"
          style="color: var(--text-muted)"
        />
        <RefreshCw
          v-else
          :size="14"
          :style="{
            color:
              pullDistance >= threshold ? 'var(--text)' : 'var(--text-faint)',
            transform: `rotate(${pullDistance * 3}deg)`,
          }"
        />
        <span class="text-[10px]" style="color: var(--text-muted)">{{
          refreshing
            ? "Sincronizando..."
            : pullDistance >= threshold
              ? "Soltar para sincronizar"
              : "Tira para sincronizar"
        }}</span>
      </div>
    </div>

    <AppHeader
      :is-dark="isDark"
      v-model:search="searchQuery"
      @toggle-dark="toggleDark()"
      @open-settings="showSettingsModal = true"
      @open-export="showExportModal = true"
      @open-import="showImportModal = true"
    />

    <main class="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 pb-12">
      <!-- Empty state: no years -->
      <div
        v-if="!store.hasYears"
        class="mt-20 flex flex-col items-center justify-center text-center animate-fade-in"
      >
        <CalendarPlus :size="48" style="color: var(--text-faint)" />
        <h2 class="font-display text-2xl mt-4" style="color: var(--text)">
          Empieza añadiendo un año
        </h2>
        <p class="text-sm mt-2 max-w-xs" style="color: var(--text-muted)">
          Añade el año que quieras registrar para comenzar a llevar tu cronolog.
        </p>
        <div class="mt-6">
          <YearSelector />
        </div>
      </div>

      <!-- Has years -->
      <template v-else>
        <!-- Sticky subheader on mobile: year selector + category tabs -->
        <div
          class="sm:static sticky top-14 z-20 -mx-3 sm:mx-0 px-3 sm:px-0 sm:bg-transparent"
          style="
            background: color-mix(in srgb, var(--bg) 92%, transparent);
            backdrop-filter: blur(8px);
          "
        >
          <YearSelector v-if="!store.isWishlistMode" />

          <!-- Empty state: no categories -->
          <div
            v-if="store.sortedCategories.length === 0"
            class="mt-16 flex flex-col items-center justify-center text-center animate-fade-in"
          >
            <FolderPlus :size="48" style="color: var(--text-faint)" />
            <h2 class="font-display text-2xl mt-4" style="color: var(--text)">
              Añade tu primera categoría
            </h2>
            <p class="text-sm mt-2 max-w-xs" style="color: var(--text-muted)">
              Crea categorías como Películas, Libros, Juegos… para organizar tu
              consumo.
            </p>
            <button
              @click="openAddCategory"
              class="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
              style="background: var(--text); color: var(--bg)"
            >
              <Plus :size="16" />
              Nueva categoría
            </button>
          </div>

          <!-- Category filter tabs (mobile) -->
          <CategoryTabs
            v-if="store.sortedCategories.length > 0"
            v-model="activeCategoryFilter"
          />
        </div>

        <!-- Has categories -->
        <template v-if="store.sortedCategories.length > 0">
          <!-- Toolbar: view toggle + actions -->
          <div class="mt-4 flex items-center justify-between gap-2">
            <!-- View toggle -->
            <div
              class="flex items-center gap-0.5 p-0.5 rounded-lg"
              style="
                background: var(--bg-muted);
                border: 1px solid var(--border);
              "
            >
              <button
                @click="viewMode = 'grid'"
                class="p-1.5 rounded-md transition-colors cursor-pointer"
                :style="{
                  background:
                    viewMode === 'grid' ? 'var(--bg-elevated)' : 'transparent',
                  color:
                    viewMode === 'grid' ? 'var(--text)' : 'var(--text-faint)',
                  boxShadow:
                    viewMode === 'grid' ? 'var(--shadow-card)' : 'none',
                }"
                title="Vista detallada"
              >
                <LayoutGrid :size="14" />
              </button>
              <button
                @click="viewMode = 'compact'"
                class="p-1.5 rounded-md transition-colors cursor-pointer"
                :style="{
                  background:
                    viewMode === 'compact'
                      ? 'var(--bg-elevated)'
                      : 'transparent',
                  color:
                    viewMode === 'compact'
                      ? 'var(--text)'
                      : 'var(--text-faint)',
                  boxShadow:
                    viewMode === 'compact' ? 'var(--shadow-card)' : 'none',
                }"
                title="Vista compacta"
              >
                <List :size="14" />
              </button>
              <button
                @click="viewMode = 'table'"
                class="hidden sm:block p-1.5 rounded-md transition-colors cursor-pointer"
                :style="{
                  background:
                    viewMode === 'table' ? 'var(--bg-elevated)' : 'transparent',
                  color:
                    viewMode === 'table' ? 'var(--text)' : 'var(--text-faint)',
                  boxShadow:
                    viewMode === 'table' ? 'var(--shadow-card)' : 'none',
                }"
                title="Vista tabla"
              >
                <Table2 :size="14" />
              </button>
              <button
                @click="viewMode = 'stats'"
                v-if="!store.isWishlistMode"
                class="p-1.5 rounded-md transition-colors cursor-pointer"
                :style="{
                  background:
                    viewMode === 'stats' ? 'var(--bg-elevated)' : 'transparent',
                  color:
                    viewMode === 'stats' ? 'var(--text)' : 'var(--text-faint)',
                  boxShadow:
                    viewMode === 'stats' ? 'var(--shadow-card)' : 'none',
                }"
                title="Estadísticas"
              >
                <BarChart3 :size="14" />
              </button>
              <button
                @click="viewMode = 'timeline'"
                v-if="!store.isWishlistMode"
                class="p-1.5 rounded-md transition-colors cursor-pointer"
                :style="{
                  background:
                    viewMode === 'timeline'
                      ? 'var(--bg-elevated)'
                      : 'transparent',
                  color:
                    viewMode === 'timeline'
                      ? 'var(--text)'
                      : 'var(--text-faint)',
                  boxShadow:
                    viewMode === 'timeline' ? 'var(--shadow-card)' : 'none',
                }"
                title="Timeline"
              >
                <Clock :size="14" />
              </button>
            </div>

            <div class="flex items-center gap-2">
              <button
                @click="showImportModal = true"
                class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                style="
                  color: var(--text-muted);
                  border: 1px dashed var(--border);
                "
              >
                Importar
              </button>
              <button
                @click="openAddCategory"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                style="
                  color: var(--text-muted);
                  border: 1px dashed var(--border);
                "
              >
                <Plus :size="14" />
                Nueva categoría
              </button>
            </div>
          </div>

          <!-- Content views -->
          <Transition :name="yearTransition" mode="out-in">
            <div :key="store.isWishlistMode ? 'wishlist' : store.activeYear">
              <!-- Table view (desktop) -->
              <div v-if="viewMode === 'table'" class="mt-6">
                <TableView :wishlist-mode="store.isWishlistMode" @edit-item="openDetailItem" />
              </div>

              <!-- Stats view -->
              <div v-else-if="viewMode === 'stats' && !store.isWishlistMode" class="mt-6">
                <ExpandedStats />
              </div>

              <!-- Timeline view -->
              <div v-else-if="viewMode === 'timeline' && !store.isWishlistMode" class="mt-6">
                <ActivityTimeline @select-item="openDetailItem" />
              </div>

              <!-- Grid / Compact view -->
              <div
                v-else
                class="mt-6 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                style="grid-auto-rows: min-content"
              >
                <CategoryColumn
                  v-for="cat in filteredCategories"
                  :key="cat.id"
                  :category="cat"
                  :items="filteredItemsForCategory(cat.id)"
                  :compact="compactView"
                  :highlight-item-id="recentlyAddedItemId"
                  :wishlist-mode="store.isWishlistMode"
                  :draggable="!isTouchDevice"
                  @dragstart="onCategoryDragStart($event, cat.id)"
                  @dragover.prevent="onCategoryDragOver($event, cat.id)"
                  @dragend="onCategoryDragEnd"
                  :class="{ 'opacity-40': draggingCategoryId === cat.id }"
                  @add-item="openAddItem(cat.id)"
                  @edit-item="openDetailItem"
                  @edit-item-form="openEditItem"
                  @edit-category="openEditCategory(cat)"
                  @mark-consumed="openMarkConsumed"
                />
              </div>
            </div>
          </Transition>

          <!-- Stats bar (always visible in non-stats view, hide in wishlist) -->
          <YearStats v-if="viewMode !== 'stats' && !store.isWishlistMode" class="mt-8" />
        </template>
      </template>
    </main>

    <!-- Modals -->
    <ItemFormModal
      v-if="showItemModal"
      :key="itemModalKey"
      :item="editingItem"
      :category-id="preselectedCategoryId"
      :wishlist-mode="store.isWishlistMode"
      @close="onItemModalClose"
    />

    <ItemDetailModal
      v-if="showDetailModal && detailItem && detailCategory"
      :item="detailItem"
      :category="detailCategory"
      :wishlist-mode="store.isWishlistMode"
      @close="
        showDetailModal = false;
        detailItemId = null;
      "
      @edit="onDetailEdit"
      @mark-consumed="(item) => { showDetailModal = false; detailItemId = null; openMarkConsumed(item); }"
    />

    <CategoryFormModal
      v-if="showCategoryModal"
      :key="categoryModalKey"
      :category="editingCategory"
      @close="showCategoryModal = false"
    />

    <SettingsModal
      v-if="showSettingsModal"
      @close="showSettingsModal = false"
    />

    <ImportModal v-if="showImportModal" @close="showImportModal = false" />

    <ExportModal v-if="showExportModal" @close="showExportModal = false" />

    <EnrichmentToast />

    <!-- Mark as consumed mini-modal (wishlist → cronolog) -->
    <div
      v-if="showConsumedModal && consumedItem"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style="background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px)"
      @click.self="showConsumedModal = false"
    >
      <div
        class="w-full max-w-sm rounded-xl p-5 animate-scale-in"
        style="background: var(--bg-elevated); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15)"
      >
        <h3 class="font-display text-lg mb-1" style="color: var(--text)">
          Marcar como consumido
        </h3>
        <p class="text-xs mb-4" style="color: var(--text-muted)">
          "{{ consumedItem.title }}" pasará a tu Cronolog.
        </p>

        <div class="flex flex-col gap-3">
          <div>
            <label class="block text-xs font-medium mb-1" style="color: var(--text-muted)">Valoración</label>
            <StarRating v-model="consumedRating" :size="22" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1" style="color: var(--text-muted)">Año en Cronolog</label>
            <input
              v-model.number="consumedYear"
              type="number"
              min="1900"
              max="2100"
              class="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style="background: var(--bg-muted); color: var(--text); border: 1px solid var(--border)"
            />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1" style="color: var(--text-muted)">Fecha de consumo</label>
            <input
              v-model="consumedDate"
              type="date"
              class="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style="background: var(--bg-muted); color: var(--text); border: 1px solid var(--border)"
            />
          </div>
        </div>

        <div class="flex items-center gap-2 mt-5">
          <button
            @click="showConsumedModal = false"
            class="flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
            style="color: var(--text-muted); border: 1px solid var(--border)"
          >
            Cancelar
          </button>
          <button
            @click="confirmMarkConsumed"
            class="flex-1 py-2.5 rounded-lg text-sm font-medium text-white cursor-pointer transition-colors"
            style="background: #22c55e"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>

    <!-- Spotlight search -->
    <SpotlightSearch
      v-if="showSpotlight"
      @close="showSpotlight = false"
      @select-item="
        (item) => {
          showSpotlight = false;
          openDetailItem(item);
        }
      "
    />

    <!-- Keyboard shortcuts help -->
    <KeyboardShortcuts v-if="showShortcuts" @close="showShortcuts = false" />

    <!-- Onboarding v2 -->
    <OnboardingV2 v-if="showOnboarding" @close="dismissOnboarding" />

    <!-- Mobile bottom nav -->
    <MobileNav @open-settings="showSettingsModal = true" />
  </div>
</template>

<style scoped>
/* Year slide transitions */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.25s ease-out;
}
.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
