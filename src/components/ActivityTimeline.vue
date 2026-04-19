<script setup lang="ts">
import { computed } from "vue";
import { useCronologStore } from "@/stores/cronolog";
import DynamicIcon from "@/components/DynamicIcon.vue";
import { Star, Clock } from "lucide-vue-next";
import type { Item } from "@/schemas/cronolog";

const emit = defineEmits<{
  selectItem: [item: Item];
}>();

const store = useCronologStore();

const recentItems = computed(() => {
  return [...store.activeItems]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)
    .map((item) => ({
      item,
      category: store.categories.find((c) => c.id === item.categoryId),
    }))
    .filter((r) => r.category);
});

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}
</script>

<template>
  <div v-if="recentItems.length > 0" class="space-y-1">
    <div class="flex items-center gap-1.5 mb-3">
      <Clock :size="13" style="color: var(--text-faint)" />
      <span
        class="text-[10px] uppercase tracking-wider"
        style="color: var(--text-faint)"
        >Últimos añadidos</span
      >
    </div>

    <div
      v-for="(r, i) in recentItems"
      :key="r.item.id"
      @click="emit('selectItem', r.item)"
      class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
      :style="{ ':hover': { background: 'var(--bg-muted)' } }"
      style="border-bottom: 1px solid var(--border)"
    >
      <!-- Timeline dot -->
      <div class="flex flex-col items-center self-stretch">
        <div
          class="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
          :style="{ background: r.category!.color }"
        />
        <div
          v-if="i < recentItems.length - 1"
          class="w-px flex-1 mt-1"
          style="background: var(--border)"
        />
      </div>

      <!-- Image -->
      <div
        v-if="r.item.imageUrl"
        class="w-7 h-10 flex-shrink-0 rounded overflow-hidden"
      >
        <img
          :src="r.item.imageUrl"
          :alt="r.item.title"
          class="w-full h-full object-cover"
          loading="lazy"
          width="28"
          height="40"
        />
      </div>
      <div
        v-else
        class="w-7 h-10 flex-shrink-0 rounded flex items-center justify-center"
        :style="{ background: r.category!.color + '12' }"
      >
        <DynamicIcon
          :name="r.category!.icon"
          :size="12"
          :style="{ color: r.category!.color, opacity: 0.5 }"
        />
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <span
          class="text-xs font-medium truncate block"
          style="color: var(--text)"
          >{{ r.item.title }}</span
        >
        <div class="flex items-center gap-2 mt-0.5">
          <span
            class="text-[10px] px-1 py-0.5 rounded"
            :style="{
              background: r.category!.color + '15',
              color: r.category!.color,
            }"
            >{{ r.category!.name }}</span
          >
          <div v-if="r.item.rating" class="flex items-center gap-0.5">
            <Star :size="9" style="color: var(--star)" fill="currentColor" />
            <span
              class="text-[10px] font-mono"
              style="color: var(--text-faint)"
              >{{ r.item.rating }}</span
            >
          </div>
        </div>
      </div>

      <!-- Time -->
      <span
        class="text-[10px] flex-shrink-0"
        style="color: var(--text-faint)"
        >{{ timeAgo(r.item.createdAt) }}</span
      >
    </div>
  </div>
</template>
