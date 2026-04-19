<script setup lang="ts">
import { useCronologStore } from "@/stores/cronolog";
import { computed, ref } from "vue";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-vue-next";
import ConfirmModal from "@/components/ConfirmModal.vue";

const store = useCronologStore();

const currentYear = new Date().getFullYear();
const showAddYear = ref(false);
const newYearInput = ref<number>(currentYear);

// Confirm delete state
const showDeleteConfirm = ref(false);
const yearToDelete = ref<number | null>(null);
const deleteItemCount = ref(0);

const displayYears = computed(() => {
  return store.availableYears;
});

function yearItemCount(year: number): number {
  return store.items.filter((i) => i.year === year).length;
}

function prevYear() {
  const idx = displayYears.value.indexOf(store.activeYear);
  if (idx > 0) store.setActiveYear(displayYears.value[idx - 1]);
}

function nextYear() {
  const idx = displayYears.value.indexOf(store.activeYear);
  if (idx < displayYears.value.length - 1)
    store.setActiveYear(displayYears.value[idx + 1]);
}

function addYear() {
  if (newYearInput.value >= 1900 && newYearInput.value <= 2100) {
    store.addYear(newYearInput.value);
    showAddYear.value = false;
  }
}

function deleteYear(year: number) {
  const itemCount = store.items.filter((i) => i.year === year).length;
  if (itemCount === 0) {
    store.removeYear(year);
  } else {
    yearToDelete.value = year;
    deleteItemCount.value = itemCount;
    showDeleteConfirm.value = true;
  }
}

function confirmDeleteYear() {
  if (yearToDelete.value !== null) {
    store.removeYear(yearToDelete.value);
  }
  showDeleteConfirm.value = false;
  yearToDelete.value = null;
}
</script>

<template>
  <div class="flex items-center gap-2 mt-6">
    <template v-if="displayYears.length > 0">
      <button
        @click="prevYear"
        class="p-1.5 rounded-md transition-colors cursor-pointer"
        style="color: var(--text-muted)"
        :disabled="displayYears.indexOf(store.activeYear) === 0"
        :style="{
          opacity: displayYears.indexOf(store.activeYear) === 0 ? 0.3 : 1,
        }"
      >
        <ChevronLeft :size="18" />
      </button>

      <div class="flex gap-1 overflow-x-auto py-2 -my-2 px-1 -mx-1">
        <div
          v-for="year in displayYears"
          :key="year"
          class="group/year relative flex items-center"
        >
          <button
            @click="store.setActiveYear(year)"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            :style="{
              background:
                year === store.activeYear ? 'var(--text)' : 'transparent',
              color:
                year === store.activeYear ? 'var(--bg)' : 'var(--text-muted)',
            }"
          >
            {{ year }}
            <span
              v-if="yearItemCount(year) > 0"
              class="text-[10px] font-mono px-1 rounded-md"
              :style="{
                background:
                  year === store.activeYear
                    ? 'rgba(255,255,255,0.2)'
                    : 'var(--bg-muted)',
                color:
                  year === store.activeYear ? 'var(--bg)' : 'var(--text-faint)',
              }"
            >
              {{ yearItemCount(year) }}
            </span>
          </button>
          <button
            @click.stop="deleteYear(year)"
            class="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover/year:opacity-100 transition-opacity cursor-pointer"
            style="background: #ef4444; color: white"
            title="Eliminar año"
          >
            <X :size="10" />
          </button>
        </div>
      </div>

      <button
        @click="nextYear"
        class="p-1.5 rounded-md transition-colors cursor-pointer"
        style="color: var(--text-muted)"
        :disabled="
          displayYears.indexOf(store.activeYear) === displayYears.length - 1
        "
        :style="{
          opacity:
            displayYears.indexOf(store.activeYear) === displayYears.length - 1
              ? 0.3
              : 1,
        }"
      >
        <ChevronRight :size="18" />
      </button>
    </template>

    <!-- Add year -->
    <div class="relative" :class="{ 'ml-2': displayYears.length > 0 }">
      <button
        v-if="displayYears.length > 0"
        @click="showAddYear = !showAddYear"
        class="p-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1"
        style="color: var(--text-faint)"
        title="Añadir año"
      >
        <Plus :size="16" />
      </button>
      <button
        v-else
        @click="showAddYear = !showAddYear"
        class="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
        style="background: var(--text); color: var(--bg)"
      >
        <Plus :size="16" />
        Añadir año
      </button>

      <div
        v-if="showAddYear"
        class="absolute top-full left-0 mt-1 flex items-center gap-1 p-2 rounded-lg z-10 animate-scale-in"
        style="
          background: var(--bg-elevated);
          box-shadow: var(--shadow-card-hover);
          border: 1px solid var(--border);
        "
      >
        <input
          v-model.number="newYearInput"
          type="number"
          min="1900"
          max="2100"
          class="w-20 px-2 py-1 rounded-md text-sm outline-none"
          style="
            background: var(--bg-muted);
            color: var(--text);
            border: 1px solid var(--border);
          "
          @keydown.enter="addYear"
        />
        <button
          @click="addYear"
          class="px-2 py-1 rounded-md text-xs font-medium cursor-pointer"
          style="background: var(--text); color: var(--bg)"
        >
          Ir
        </button>
      </div>
    </div>

    <!-- Delete year confirm modal -->
    <ConfirmModal
      v-if="showDeleteConfirm && yearToDelete !== null"
      :title="`Eliminar ${yearToDelete}`"
      :message="`Se eliminarán ${deleteItemCount} elemento${deleteItemCount !== 1 ? 's' : ''} registrado${deleteItemCount !== 1 ? 's' : ''} en este año. Esta acción no se puede deshacer.`"
      confirm-text="Eliminar año"
      :danger="true"
      @confirm="confirmDeleteYear"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>
