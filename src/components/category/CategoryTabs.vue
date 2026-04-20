<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useCronologStore } from "@/stores/cronolog";
import DynamicIcon from "@/components/DynamicIcon.vue";

const modelValue = defineModel<string | null>({ default: null });

const store = useCronologStore();
const scrollRef = ref<HTMLElement | null>(null);

// Only show categories that have items in the current year
const categoriesWithItems = computed(() =>
  store.sortedCategories.filter((c) => store.itemsForCategory(c.id).length > 0),
);

const totalItems = computed(() =>
  store.sortedCategories.reduce(
    (sum, c) => sum + store.itemsForCategory(c.id).length,
    0,
  ),
);

function toggle(catId: string) {
  modelValue.value = modelValue.value === catId ? null : catId;
}

// Keep active tab visible
watch(modelValue, async (id) => {
  await nextTick();
  const track = scrollRef.value;
  if (!track || !id) return;
  const el = track.querySelector<HTMLElement>(`[data-cat='${id}']`);
  if (el)
    el.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
});
</script>

<template>
  <div
    ref="scrollRef"
    class="sm:hidden flex items-center gap-2 overflow-x-auto scrollbar-none py-2 -mx-3 px-3"
  >
    <button
      @click="modelValue = null"
      class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer"
      :style="{
        background: modelValue === null ? 'var(--text)' : 'var(--bg-muted)',
        color: modelValue === null ? 'var(--bg)' : 'var(--text-muted)',
        border: `1px solid ${modelValue === null ? 'var(--text)' : 'var(--border)'}`,
      }"
    >
      Todas
      <span v-if="totalItems > 0" class="text-[10px] opacity-70">{{
        totalItems
      }}</span>
    </button>
    <button
      v-for="cat in categoriesWithItems"
      :key="cat.id"
      :data-cat="cat.id"
      @click="toggle(cat.id)"
      class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer"
      :style="{
        background:
          modelValue === cat.id ? cat.color + '15' : 'var(--bg-muted)',
        color: modelValue === cat.id ? cat.color : 'var(--text-muted)',
        border: `1px solid ${modelValue === cat.id ? cat.color + '40' : 'var(--border)'}`,
      }"
    >
      <DynamicIcon :name="cat.icon" :size="12" />
      {{ cat.name }}
      <span class="text-[10px] opacity-70">{{
        store.itemsForCategory(cat.id).length
      }}</span>
    </button>
  </div>
</template>
