<script setup lang="ts">
import { RouterView } from "vue-router";
import { inject, reactive } from "vue";
import ToastContainer from "@/components/ToastContainer.vue";

const appLoading = inject<{ value: boolean }>(
  "appLoading",
  reactive({ value: false }),
);
</script>

<template>
  <!-- Global loading screen -->
  <div
    v-if="appLoading.value"
    class="min-h-screen flex flex-col items-center justify-center"
    style="background: var(--bg)"
  >
    <h1
      class="font-display text-3xl tracking-tight mb-4"
      style="color: var(--text)"
    >
      Cronolog
    </h1>
    <div class="flex gap-1">
      <div
        v-for="i in 3"
        :key="i"
        class="w-2 h-2 rounded-full animate-bounce"
        :style="{
          background: 'var(--text-faint)',
          animationDelay: `${i * 150}ms`,
        }"
      />
    </div>
  </div>

  <template v-else>
    <RouterView />
    <ToastContainer />
  </template>
</template>
