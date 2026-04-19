<script setup lang="ts">
import { ref, computed } from "vue";
import { Star } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    modelValue: number;
    readonly?: boolean;
    size?: number;
  }>(),
  {
    readonly: false,
    size: 16,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: number];
}>();

const hoverValue = ref(0);

const displayValue = computed(() => hoverValue.value || props.modelValue);

function getStarState(index: number): "full" | "half" | "empty" {
  const val = displayValue.value;
  if (index <= val) return "full";
  if (index - 0.5 <= val) return "half";
  return "empty";
}

function handleClick(index: number, event: MouseEvent) {
  if (props.readonly) return;
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const isLeftHalf = event.clientX - rect.left < rect.width / 2;
  const value = isLeftHalf ? index - 0.5 : index;
  emit("update:modelValue", value === props.modelValue ? 0 : value);
}

function handleHover(index: number, event: MouseEvent) {
  if (props.readonly) return;
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const isLeftHalf = event.clientX - rect.left < rect.width / 2;
  hoverValue.value = isLeftHalf ? index - 0.5 : index;
}
</script>

<template>
  <div
    class="inline-flex items-center gap-0.5"
    :class="{ 'cursor-pointer': !readonly }"
    @mouseleave="hoverValue = 0"
  >
    <button
      v-for="i in 5"
      :key="i"
      type="button"
      class="relative p-0 border-0 bg-transparent transition-transform duration-100"
      :class="{
        'cursor-pointer hover:scale-110': !readonly,
        'cursor-default': readonly,
      }"
      :tabindex="readonly ? -1 : 0"
      @click="handleClick(i, $event)"
      @mousemove="handleHover(i, $event)"
      @keydown.enter.prevent="handleClick(i, $event as unknown as MouseEvent)"
    >
      <!-- Empty star (background) -->
      <Star
        :size="size"
        :stroke-width="1.5"
        style="
          color: var(--text-faint);
          fill: transparent;
          transition: color 0.15s;
        "
      />
      <!-- Full star overlay -->
      <Star
        v-if="getStarState(i) === 'full'"
        :size="size"
        :stroke-width="1.5"
        class="absolute inset-0"
        style="
          color: var(--star);
          fill: var(--star);
          transition:
            color 0.15s,
            fill 0.15s;
        "
      />
      <!-- Half star overlay (clip left half) -->
      <div
        v-else-if="getStarState(i) === 'half'"
        class="absolute inset-0 overflow-hidden"
        :style="{ width: '50%' }"
      >
        <Star
          :size="size"
          :stroke-width="1.5"
          style="
            color: var(--star);
            fill: var(--star);
            transition:
              color 0.15s,
              fill 0.15s;
          "
        />
      </div>
    </button>
  </div>
</template>
