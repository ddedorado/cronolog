<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useCronologStore } from "@/stores/cronolog";
import DynamicIcon from "@/components/DynamicIcon.vue";
import { Search, X, Star, ArrowRight } from "lucide-vue-next";

const emit = defineEmits<{
  close: [];
  selectItem: [item: any];
}>();

const store = useCronologStore();
const query = ref("");
const inputRef = ref<HTMLInputElement | null>(null);
const selectedIndex = ref(0);

const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) {
    // Show recent items
    return [...store.items]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map((item) => {
        const cat = store.categories.find((c) => c.id === item.categoryId);
        return { item, category: cat };
      })
      .filter((r) => r.category);
  }
  return store.items
    .filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.releaseYear && String(i.releaseYear).includes(q)) ||
        (i.notes && i.notes.toLowerCase().includes(q)) ||
        (i.tags && i.tags.some((t) => t.toLowerCase().includes(q))) ||
        Object.values(i.customFields).some((v) =>
          String(v).toLowerCase().includes(q),
        ),
    )
    .slice(0, 12)
    .map((item) => {
      const cat = store.categories.find((c) => c.id === item.categoryId);
      return { item, category: cat };
    })
    .filter((r) => r.category);
});

watch(query, () => {
  selectedIndex.value = 0;
});

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex.value = Math.min(
      selectedIndex.value + 1,
      results.value.length - 1,
    );
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
  } else if (e.key === "Enter" && results.value[selectedIndex.value]) {
    emit("selectItem", results.value[selectedIndex.value].item);
  } else if (e.key === "Escape") {
    emit("close");
  }
}

nextTick(() => inputRef.value?.focus());
</script>

<template>
  <div
    class="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4 animate-fade-in"
    style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px)"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-lg rounded-xl overflow-hidden animate-scale-in"
      style="
        background: var(--bg-elevated);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25);
        border: 1px solid var(--border);
      "
    >
      <!-- Search input -->
      <div
        class="flex items-center gap-3 px-4 py-3"
        style="border-bottom: 1px solid var(--border)"
      >
        <Search :size="18" style="color: var(--text-faint)" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          placeholder="Buscar en tu cronolog..."
          class="flex-1 bg-transparent text-sm outline-none"
          style="color: var(--text)"
          @keydown="handleKeydown"
        />
        <kbd
          class="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded"
          style="
            background: var(--bg-muted);
            color: var(--text-faint);
            border: 1px solid var(--border);
          "
          >ESC</kbd
        >
      </div>

      <!-- Results -->
      <div class="max-h-[50vh] overflow-y-auto">
        <p
          v-if="results.length === 0 && query"
          class="text-sm text-center py-8"
          style="color: var(--text-faint)"
        >
          Sin resultados para "{{ query }}"
        </p>
        <p
          v-else-if="!query"
          class="text-[10px] uppercase tracking-wider px-4 pt-3 pb-1"
          style="color: var(--text-faint)"
        >
          Recientes
        </p>
        <button
          v-for="(r, i) in results"
          :key="r.item.id"
          @click="emit('selectItem', r.item)"
          @mouseenter="selectedIndex = i"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors"
          :style="{
            background: i === selectedIndex ? 'var(--bg-muted)' : 'transparent',
          }"
        >
          <!-- Image -->
          <div
            v-if="r.item.imageUrl"
            class="w-8 h-11 flex-shrink-0 rounded overflow-hidden"
          >
            <img
              :src="r.item.imageUrl"
              :alt="r.item.title"
              class="w-full h-full object-cover"
              loading="lazy"
              width="32"
              height="44"
            />
          </div>
          <div
            v-else
            class="w-8 h-11 flex-shrink-0 rounded flex items-center justify-center"
            :style="{ background: r.category!.color + '12' }"
          >
            <DynamicIcon
              :name="r.category!.icon"
              :size="14"
              :style="{ color: r.category!.color, opacity: 0.5 }"
            />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span
                class="text-sm font-medium truncate"
                style="color: var(--text)"
                >{{ r.item.title }}</span
              >
              <Star
                v-if="r.item.favorite"
                :size="11"
                style="color: var(--star)"
                fill="currentColor"
              />
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span
                class="text-[10px] px-1.5 py-0.5 rounded"
                :style="{
                  background: r.category!.color + '15',
                  color: r.category!.color,
                }"
                >{{ r.category!.name }}</span
              >
              <span
                v-if="r.item.releaseYear"
                class="text-[10px] font-mono"
                style="color: var(--text-faint)"
                >{{ r.item.releaseYear }}</span
              >
              <span class="text-[10px]" style="color: var(--text-faint)">{{
                r.item.year
              }}</span>
            </div>
          </div>

          <ArrowRight
            v-if="i === selectedIndex"
            :size="14"
            style="color: var(--text-faint)"
          />
        </button>
      </div>

      <!-- Footer -->
      <div
        class="hidden sm:flex items-center gap-4 px-4 py-2 text-[10px]"
        style="border-top: 1px solid var(--border); color: var(--text-faint)"
      >
        <span><kbd class="font-mono">↑↓</kbd> navegar</span>
        <span><kbd class="font-mono">↵</kbd> abrir</span>
        <span><kbd class="font-mono">esc</kbd> cerrar</span>
      </div>
    </div>
  </div>
</template>
