<script setup lang="ts">
import { computed } from "vue";
import { useCronologStore } from "@/stores/cronolog";
import DynamicIcon from "@/components/DynamicIcon.vue";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Calendar,
  Award,
  Heart,
} from "lucide-vue-next";

const store = useCronologStore();

const activeItems = computed(() => store.activeItems);

const avgRating = computed(() => {
  const rated = activeItems.value.filter((i) => i.rating > 0);
  if (!rated.length) return 0;
  return rated.reduce((s, i) => s + i.rating, 0) / rated.length;
});

const topRated = computed(() =>
  [...activeItems.value]
    .filter((i) => i.rating >= 4)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5)
    .map((item) => ({
      item,
      category: store.categories.find((c) => c.id === item.categoryId),
    })),
);

const favorites = computed(() =>
  activeItems.value
    .filter((i) => i.favorite)
    .map((item) => ({
      item,
      category: store.categories.find((c) => c.id === item.categoryId),
    })),
);

const monthlyData = computed(() => {
  const months: Record<number, number> = {};
  for (let m = 0; m < 12; m++) months[m] = 0;
  for (const item of activeItems.value) {
    if (item.consumedDate) {
      const d = new Date(item.consumedDate);
      if (!isNaN(d.getTime())) months[d.getMonth()]++;
    }
  }
  return months;
});

const monthNames = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const maxMonthly = computed(() =>
  Math.max(...Object.values(monthlyData.value), 1),
);

// Previous year comparison
const prevYear = computed(() => store.activeYear - 1);
const prevYearItems = computed(() =>
  store.items.filter((i) => i.year === prevYear.value),
);
const yearDiff = computed(
  () => activeItems.value.length - prevYearItems.value.length,
);

const catStats = computed(() =>
  store.sortedCategories
    .map((cat) => {
      const items = activeItems.value.filter((i) => i.categoryId === cat.id);
      const rated = items.filter((i) => i.rating > 0);
      const avg =
        rated.length > 0
          ? rated.reduce((s, i) => s + i.rating, 0) / rated.length
          : 0;
      return {
        category: cat,
        count: items.length,
        avgRating: avg,
        favoriteCount: items.filter((i) => i.favorite).length,
      };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count),
);
</script>

<template>
  <div v-if="store.totalActiveItems > 0" class="space-y-4 animate-fade-in">
    <!-- Summary cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div
        class="p-3 rounded-xl"
        style="background: var(--bg-muted); border: 1px solid var(--border)"
      >
        <div class="flex items-center gap-1.5 mb-1">
          <BarChart3 :size="13" style="color: var(--text-faint)" />
          <span
            class="text-[10px] uppercase tracking-wider"
            style="color: var(--text-faint)"
            >Total</span
          >
        </div>
        <span class="font-display text-2xl" style="color: var(--text)">{{
          store.totalActiveItems
        }}</span>
        <div
          v-if="prevYearItems.length > 0"
          class="flex items-center gap-1 mt-1"
        >
          <TrendingUp v-if="yearDiff > 0" :size="11" style="color: #22c55e" />
          <TrendingDown
            v-else-if="yearDiff < 0"
            :size="11"
            style="color: var(--danger)"
          />
          <Minus v-else :size="11" style="color: var(--text-faint)" />
          <span
            class="text-[10px]"
            :style="{
              color:
                yearDiff > 0
                  ? '#22c55e'
                  : yearDiff < 0
                    ? 'var(--danger)'
                    : 'var(--text-faint)',
            }"
            >{{ yearDiff > 0 ? "+" : "" }}{{ yearDiff }} vs {{ prevYear }}</span
          >
        </div>
      </div>

      <div
        class="p-3 rounded-xl"
        style="background: var(--bg-muted); border: 1px solid var(--border)"
      >
        <div class="flex items-center gap-1.5 mb-1">
          <Star :size="13" style="color: var(--star)" />
          <span
            class="text-[10px] uppercase tracking-wider"
            style="color: var(--text-faint)"
            >Nota media</span
          >
        </div>
        <span class="font-display text-2xl" style="color: var(--text)">{{
          avgRating.toFixed(1)
        }}</span>
        <span class="text-[10px] ml-1" style="color: var(--text-faint)"
          >/ 5</span
        >
      </div>

      <div
        class="p-3 rounded-xl"
        style="background: var(--bg-muted); border: 1px solid var(--border)"
      >
        <div class="flex items-center gap-1.5 mb-1">
          <Heart :size="13" style="color: #ef4444" />
          <span
            class="text-[10px] uppercase tracking-wider"
            style="color: var(--text-faint)"
            >Favoritos</span
          >
        </div>
        <span class="font-display text-2xl" style="color: var(--text)">{{
          favorites.length
        }}</span>
      </div>

      <div
        class="p-3 rounded-xl"
        style="background: var(--bg-muted); border: 1px solid var(--border)"
      >
        <div class="flex items-center gap-1.5 mb-1">
          <Award :size="13" style="color: #a855f7" />
          <span
            class="text-[10px] uppercase tracking-wider"
            style="color: var(--text-faint)"
            >Top categoría</span
          >
        </div>
        <span
          v-if="catStats[0]"
          class="font-display text-lg leading-tight"
          style="color: var(--text)"
          >{{ catStats[0].category.name }}</span
        >
        <span class="text-[10px] ml-1" style="color: var(--text-faint)">{{
          catStats[0]?.count ?? 0
        }}</span>
      </div>
    </div>

    <!-- Monthly activity -->
    <div
      class="p-4 rounded-xl"
      style="background: var(--bg-muted); border: 1px solid var(--border)"
    >
      <div class="flex items-center gap-1.5 mb-3">
        <Calendar :size="13" style="color: var(--text-faint)" />
        <span
          class="text-[10px] uppercase tracking-wider"
          style="color: var(--text-faint)"
          >Actividad por mes</span
        >
      </div>
      <div class="flex items-end gap-1 h-20">
        <div
          v-for="(count, month) in monthlyData"
          :key="month"
          class="flex-1 flex flex-col items-center gap-1"
        >
          <span
            v-if="count > 0"
            class="text-[9px] font-mono"
            style="color: var(--text-faint)"
            >{{ count }}</span
          >
          <div
            class="w-full rounded-sm transition-all duration-500"
            :style="{
              height:
                count > 0
                  ? Math.max((count / maxMonthly) * 100, 8) + '%'
                  : '4px',
              background: count > 0 ? 'var(--text)' : 'var(--border)',
              opacity: count > 0 ? 0.7 : 0.3,
            }"
          />
          <span class="text-[9px]" style="color: var(--text-faint)">{{
            monthNames[Number(month)]
          }}</span>
        </div>
      </div>
    </div>

    <!-- Per-category breakdown -->
    <div
      class="p-4 rounded-xl"
      style="background: var(--bg-muted); border: 1px solid var(--border)"
    >
      <span
        class="text-[10px] uppercase tracking-wider"
        style="color: var(--text-faint)"
        >Por categoría</span
      >
      <div class="mt-3 space-y-2">
        <div
          v-for="cs in catStats"
          :key="cs.category.id"
          class="flex items-center gap-3"
        >
          <DynamicIcon
            :name="cs.category.icon"
            :size="14"
            :style="{ color: cs.category.color }"
          />
          <span class="text-xs flex-1" style="color: var(--text)">{{
            cs.category.name
          }}</span>
          <div
            class="w-24 h-1.5 rounded-full overflow-hidden"
            style="background: var(--border)"
          >
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{
                width: (cs.count / store.totalActiveItems) * 100 + '%',
                background: cs.category.color,
              }"
            />
          </div>
          <span
            class="text-xs font-mono w-6 text-right"
            style="color: var(--text-muted)"
            >{{ cs.count }}</span
          >
          <span v-if="cs.avgRating > 0" class="flex items-center gap-0.5">
            <Star :size="10" style="color: var(--star)" fill="currentColor" />
            <span
              class="text-[10px] font-mono"
              style="color: var(--text-faint)"
              >{{ cs.avgRating.toFixed(1) }}</span
            >
          </span>
        </div>
      </div>
    </div>

    <!-- Top rated -->
    <div
      v-if="topRated.length > 0"
      class="p-4 rounded-xl"
      style="background: var(--bg-muted); border: 1px solid var(--border)"
    >
      <span
        class="text-[10px] uppercase tracking-wider"
        style="color: var(--text-faint)"
        >Mejor valorados</span
      >
      <div class="mt-3 space-y-2">
        <div
          v-for="(tr, i) in topRated"
          :key="tr.item.id"
          class="flex items-center gap-3"
        >
          <span
            class="text-xs font-mono w-4 text-right"
            style="color: var(--text-faint)"
            >#{{ i + 1 }}</span
          >
          <div
            v-if="tr.item.imageUrl"
            class="w-6 h-8 flex-shrink-0 rounded overflow-hidden"
          >
            <img
              :src="tr.item.imageUrl"
              :alt="tr.item.title"
              class="w-full h-full object-cover"
              loading="lazy"
              width="24"
              height="32"
            />
          </div>
          <span class="text-xs flex-1 truncate" style="color: var(--text)">{{
            tr.item.title
          }}</span>
          <span
            class="text-[10px] px-1.5 py-0.5 rounded"
            :style="{
              background: tr.category?.color + '15',
              color: tr.category?.color,
            }"
            >{{ tr.category?.name }}</span
          >
          <div class="flex items-center gap-0.5">
            <Star :size="10" style="color: var(--star)" fill="currentColor" />
            <span class="text-xs font-mono" style="color: var(--text)">{{
              tr.item.rating
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
