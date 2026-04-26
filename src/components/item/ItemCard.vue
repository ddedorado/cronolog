<script setup lang="ts">
import type { Item, Category } from "@/schemas/cronolog";
import { formatDate } from "@/utils/helpers";
import { Calendar, Sparkles } from "lucide-vue-next";
import StarRating from "@/components/StarRating.vue";
import DynamicIcon from "@/components/DynamicIcon.vue";
import { ref, computed } from "vue";

const props = defineProps<{
  item: Item;
  category: Category;
  wishlistMode?: boolean;
}>();

const imgError = ref(false);

const fieldLabel = computed(() => {
  const map: Record<string, string> = {};
  for (const f of props.category.fields) {
    map[f.id] = f.name;
  }
  return map;
});

const visibleCustomFields = computed(() => {
  return Object.entries(props.item.customFields).filter(
    ([, v]) => v !== "" && v !== null && v !== undefined,
  );
});
</script>

<template>
  <div
    class="item-card group relative rounded-lg cursor-pointer transition-all duration-200 overflow-hidden"
    :style="{
      background: 'var(--bg-elevated)',
      boxShadow: 'var(--shadow-card)',
      borderLeft: `3px solid ${category.color}`,
    }"
  >
    <div class="flex gap-3 p-3">
      <!-- Image (left thumbnail) -->
      <div
        v-if="item.imageUrl && !imgError"
        class="w-16 h-22 flex-shrink-0 rounded-md overflow-hidden"
      >
        <img
          :src="item.imageUrl"
          :alt="item.title"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
          width="64"
          height="88"
          @error="imgError = true"
        />
      </div>
      <!-- Placeholder when no image -->
      <div
        v-else
        class="w-16 h-22 flex-shrink-0 rounded-md flex items-center justify-center"
        :style="{ background: category.color + '12' }"
      >
        <DynamicIcon
          :name="category.icon"
          :size="20"
          :style="{ color: category.color, opacity: 0.4 }"
        />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <!-- Title -->
        <div class="flex items-center gap-1">
          <p
            class="text-sm font-semibold leading-snug truncate"
            style="color: var(--text)"
            :title="item.title"
          >
            {{ item.title }}
          </p>
          <Sparkles
            v-if="item.enrichmentData"
            :size="11"
            class="flex-shrink-0"
            style="color: #f59e0b"
            title="Enriquecido"
          />
        </div>

        <!-- Release year -->
        <p
          v-if="item.releaseYear"
          class="text-xs font-mono mt-0.5"
          style="color: var(--text-faint)"
        >
          {{ item.releaseYear }}
        </p>

        <!-- Consumed date -->
        <p
          v-if="item.consumedDate && !props.wishlistMode"
          class="flex items-center gap-1 text-xs mt-1.5"
          style="color: var(--text-muted)"
        >
          <Calendar :size="11" class="flex-shrink-0" />
          {{ formatDate(item.consumedDate) }}
        </p>

        <!-- Rating -->
        <div v-if="item.rating && item.rating > 0 && !props.wishlistMode" class="mt-1.5">
          <StarRating :model-value="item.rating" :readonly="true" :size="13" />
        </div>

        <!-- Notes preview (wishlist mode) -->
        <p
          v-if="props.wishlistMode && item.notes"
          class="text-xs mt-1.5 line-clamp-2 leading-snug"
          style="color: var(--text-faint)"
        >
          {{ item.notes }}
        </p>

        <!-- Custom fields (Observaciones, Temporada, etc.) -->
        <div
          v-if="visibleCustomFields.length > 0"
          class="mt-2 flex flex-col gap-1"
        >
          <div
            v-for="[key, value] in visibleCustomFields"
            :key="key"
            class="text-xs leading-snug"
            style="color: var(--text-muted)"
          >
            <span class="font-medium" :style="{ color: category.color }"
              >{{ fieldLabel[key] || key }}:</span
            >
            {{ value }}
          </div>
        </div>
      </div>
    </div>

    <!-- Hover action hint -->
    <div
      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
    >
      <span
        class="text-[9px] font-medium px-1.5 py-0.5 rounded-md"
        style="background: var(--text); color: var(--bg)"
      >
        Ver
      </span>
    </div>
  </div>
</template>

<style scoped>
@media (hover: hover) {
  .item-card:hover {
    box-shadow: var(--shadow-card-hover) !important;
  }
}
.item-card:active {
  box-shadow: var(--shadow-card-hover) !important;
}
</style>
