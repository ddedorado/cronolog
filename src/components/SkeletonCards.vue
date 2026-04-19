<template>
  <div class="flex flex-col gap-2 animate-pulse">
    <div
      v-for="i in count"
      :key="i"
      class="rounded-lg overflow-hidden"
      style="
        background: var(--bg-elevated);
        border-left: 3px solid var(--border);
      "
    >
      <div class="flex gap-3 p-3">
        <!-- Image skeleton -->
        <div
          class="w-16 h-22 flex-shrink-0 rounded-md"
          style="background: var(--bg-muted)"
        />
        <!-- Content skeleton -->
        <div class="flex-1 flex flex-col gap-2 py-1">
          <div
            class="h-3.5 rounded"
            style="background: var(--bg-muted); width: 70%"
          />
          <div
            class="h-2.5 rounded"
            style="background: var(--bg-muted); width: 30%"
          />
          <div
            class="h-2.5 rounded mt-auto"
            style="background: var(--bg-muted); width: 50%"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  count?: number;
}>();
</script>
