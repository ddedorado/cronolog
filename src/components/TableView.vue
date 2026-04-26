<script setup lang="ts">
import { ref, computed } from "vue";
import { useCronologStore } from "@/stores/cronolog";
import DynamicIcon from "@/components/DynamicIcon.vue";
import {
  Star,
  Heart,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-vue-next";
import type { Item } from "@/schemas/cronolog";

const props = defineProps<{
  wishlistMode?: boolean;
}>();

const emit = defineEmits<{
  editItem: [item: Item];
}>();

const store = useCronologStore();
const sortKey = ref<
  "title" | "rating" | "category" | "consumedDate" | "releaseYear"
>("consumedDate");
const sortAsc = ref(false);

const items = computed(() => {
  const sourceItems = props.wishlistMode ? store.wishlistItems : store.activeItems;
  const list = sourceItems.map((item) => ({
    item,
    category: store.categories.find((c) => c.id === item.categoryId),
  }));

  return list.sort((a, b) => {
    let cmp = 0;
    switch (sortKey.value) {
      case "title":
        cmp = a.item.title.localeCompare(b.item.title);
        break;
      case "rating":
        cmp = a.item.rating - b.item.rating;
        break;
      case "category":
        cmp = (a.category?.name ?? "").localeCompare(b.category?.name ?? "");
        break;
      case "consumedDate":
        cmp = (a.item.consumedDate || "9999").localeCompare(
          b.item.consumedDate || "9999",
        );
        break;
      case "releaseYear":
        cmp = (a.item.releaseYear ?? 0) - (b.item.releaseYear ?? 0);
        break;
    }
    return sortAsc.value ? cmp : -cmp;
  });
});

function toggleSort(key: typeof sortKey.value) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = key === "title";
  }
}

function sortIcon(key: typeof sortKey.value) {
  if (sortKey.value !== key) return ArrowUpDown;
  return sortAsc.value ? ChevronUp : ChevronDown;
}
</script>

<template>
  <div
    class="rounded-xl overflow-hidden"
    style="border: 1px solid var(--border)"
  >
    <div class="overflow-x-auto">
      <table class="w-full text-sm" style="color: var(--text)">
        <thead>
          <tr
            style="
              background: var(--bg-muted);
              border-bottom: 1px solid var(--border);
            "
          >
            <th class="text-left font-medium px-3 py-2">
              <button
                class="flex items-center gap-1 cursor-pointer"
                @click="toggleSort('title')"
              >
                Título
                <component
                  :is="sortIcon('title')"
                  :size="12"
                  style="color: var(--text-faint)"
                />
              </button>
            </th>
            <th class="text-left font-medium px-3 py-2">
              <button
                class="flex items-center gap-1 cursor-pointer"
                @click="toggleSort('category')"
              >
                Categoría
                <component
                  :is="sortIcon('category')"
                  :size="12"
                  style="color: var(--text-faint)"
                />
              </button>
            </th>
            <th class="text-left font-medium px-3 py-2">
              <button
                class="flex items-center gap-1 cursor-pointer"
                @click="toggleSort('rating')"
              >
                Rating
                <component
                  :is="sortIcon('rating')"
                  :size="12"
                  style="color: var(--text-faint)"
                />
              </button>
            </th>
            <th class="text-left font-medium px-3 py-2">
              <button
                class="flex items-center gap-1 cursor-pointer"
                @click="toggleSort('releaseYear')"
              >
                Año
                <component
                  :is="sortIcon('releaseYear')"
                  :size="12"
                  style="color: var(--text-faint)"
                />
              </button>
            </th>
            <th v-if="!props.wishlistMode" class="text-left font-medium px-3 py-2">
              <button
                class="flex items-center gap-1 cursor-pointer"
                @click="toggleSort('consumedDate')"
              >
                Fecha
                <component
                  :is="sortIcon('consumedDate')"
                  :size="12"
                  style="color: var(--text-faint)"
                />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="({ item, category }, i) in items"
            :key="item.id"
            @click="emit('editItem', item)"
            class="cursor-pointer transition-colors"
            :style="{
              background:
                i % 2 === 0 ? 'var(--bg-elevated)' : 'var(--bg-muted)',
              borderBottom: '1px solid var(--border)',
            }"
            @mouseenter="
              ($event.currentTarget as HTMLElement).style.background =
                'var(--bg-muted)'
            "
            @mouseleave="
              ($event.currentTarget as HTMLElement).style.background =
                i % 2 === 0 ? 'var(--bg-elevated)' : 'var(--bg-muted)'
            "
          >
            <td class="px-3 py-2">
              <div class="flex items-center gap-2">
                <div
                  v-if="item.imageUrl"
                  class="w-6 h-8 flex-shrink-0 rounded overflow-hidden"
                >
                  <img
                    :src="item.imageUrl"
                    :alt="item.title"
                    class="w-full h-full object-cover"
                    loading="lazy"
                    width="24"
                    height="32"
                  />
                </div>
                <span class="truncate max-w-[200px]">{{ item.title }}</span>
                <Heart
                  v-if="item.favorite"
                  :size="11"
                  style="color: #ef4444"
                  fill="currentColor"
                />
              </div>
            </td>
            <td class="px-3 py-2">
              <span
                v-if="category"
                class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                :style="{
                  background: category.color + '15',
                  color: category.color,
                }"
              >
                <DynamicIcon :name="category.icon" :size="11" />
                {{ category.name }}
              </span>
            </td>
            <td class="px-3 py-2">
              <div v-if="item.rating" class="flex items-center gap-0.5">
                <Star
                  :size="12"
                  style="color: var(--star)"
                  fill="currentColor"
                />
                <span class="font-mono text-xs">{{ item.rating }}</span>
              </div>
              <span v-else class="text-xs" style="color: var(--text-faint)"
                >—</span
              >
            </td>
            <td
              class="px-3 py-2 font-mono text-xs"
              style="color: var(--text-muted)"
            >
              {{ item.releaseYear ?? "—" }}
            </td>
            <td
              v-if="!props.wishlistMode"
              class="px-3 py-2 font-mono text-xs"
              style="color: var(--text-muted)"
            >
              {{ item.consumedDate || "—" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-if="items.length === 0"
      class="text-center py-8 text-sm"
      style="color: var(--text-faint)"
    >
      No hay items en {{ props.wishlistMode ? 'tu Wishlist' : store.activeYear }}
    </div>
  </div>
</template>
