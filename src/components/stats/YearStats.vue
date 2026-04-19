<script setup lang="ts">
import { useCronologStore } from "@/stores/cronolog";
import { computed } from "vue";

const store = useCronologStore();

const stats = computed(() =>
  store.sortedCategories
    .map((cat) => ({
      name: cat.name,
      color: cat.color,
      count: store.yearStats[cat.id] ?? 0,
    }))
    .filter((s) => s.count > 0),
);
</script>

<template>
  <div
    v-if="store.totalActiveItems > 0"
    class="px-4 py-3 rounded-xl"
    style="background: var(--bg-muted); border: 1px solid var(--border)"
  >
    <!-- Stacked bar -->
    <div
      class="flex h-2.5 rounded-full overflow-hidden mb-3"
      style="background: var(--border)"
    >
      <div
        v-for="stat in stats"
        :key="stat.name"
        class="transition-all duration-500 ease-out"
        :style="{
          width: (stat.count / store.totalActiveItems) * 100 + '%',
          background: stat.color,
        }"
        :title="`${stat.name}: ${stat.count}`"
      />
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-3 flex-wrap">
      <span class="font-display text-lg" style="color: var(--text)">{{
        store.activeYear
      }}</span>
      <span class="text-sm" style="color: var(--text-faint)">→</span>
      <span
        v-for="stat in stats"
        :key="stat.name"
        class="flex items-center gap-1.5 text-sm"
      >
        <span
          class="w-2 h-2 rounded-full"
          :style="{ background: stat.color }"
        />
        <span style="color: var(--text-muted)"
          >{{ stat.count }} {{ stat.name.toLowerCase() }}</span
        >
      </span>
      <span
        class="text-sm font-medium ml-auto font-mono"
        style="color: var(--text)"
      >
        = {{ store.totalActiveItems }} total
      </span>
    </div>
  </div>
</template>
