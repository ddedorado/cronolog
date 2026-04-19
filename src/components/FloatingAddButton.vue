<script setup lang="ts">
import { useCronologStore } from "@/stores/cronolog";
import DynamicIcon from "@/components/DynamicIcon.vue";
import { Plus, X } from "lucide-vue-next";
import { ref, computed } from "vue";

const emit = defineEmits<{
  addItem: [categoryId: string];
}>();

const store = useCronologStore();
const isOpen = ref(false);

const visibleCategories = computed(() =>
  store.sortedCategories.filter(
    (c) => c.dataSource !== "none" || c.fields.length > 0 || true,
  ),
);

function select(catId: string) {
  isOpen.value = false;
  emit("addItem", catId);
}
</script>

<template>
  <div class="fixed bottom-20 right-4 z-40 sm:hidden">
    <!-- Category radial menu -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 scale-90"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-90"
    >
      <div
        v-if="isOpen"
        class="absolute bottom-16 right-0 flex flex-col-reverse gap-2 items-end pb-2"
      >
        <button
          v-for="cat in visibleCategories"
          :key="cat.id"
          @click="select(cat.id)"
          class="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full shadow-lg cursor-pointer animate-scale-in"
          :style="{
            background: 'var(--bg-elevated)',
            border: `1.5px solid ${cat.color}30`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }"
        >
          <DynamicIcon
            :name="cat.icon"
            :size="16"
            :style="{ color: cat.color }"
          />
          <span
            class="text-xs font-medium whitespace-nowrap"
            style="color: var(--text)"
            >{{ cat.name }}</span
          >
        </button>
      </div>
    </Transition>

    <!-- Backdrop -->
    <div v-if="isOpen" class="fixed inset-0 z-[-1]" @click="isOpen = false" />

    <!-- FAB button -->
    <button
      @click="isOpen = !isOpen"
      class="w-14 h-14 rounded-full flex items-center justify-center shadow-xl cursor-pointer transition-transform duration-200"
      :class="{ 'rotate-45': isOpen }"
      style="background: var(--text); color: var(--bg)"
    >
      <Plus :size="24" />
    </button>
  </div>
</template>
