<script setup lang="ts">
import {
  Clapperboard,
  BookOpen,
  Tv,
  Gamepad2,
  Music,
  Mic,
  Podcast,
  Palette,
  Drama,
  Puzzle,
  Dices,
  Map,
  Utensils,
  Camera,
  Headphones,
  Guitar,
  Ticket,
  Trophy,
  Folder,
} from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{
  name: string;
  size?: number;
}>();

const iconMap: Record<string, any> = {
  clapperboard: Clapperboard,
  "book-open": BookOpen,
  tv: Tv,
  "gamepad-2": Gamepad2,
  music: Music,
  mic: Mic,
  podcast: Podcast,
  palette: Palette,
  drama: Drama,
  puzzle: Puzzle,
  dices: Dices,
  map: Map,
  utensils: Utensils,
  camera: Camera,
  headphones: Headphones,
  guitar: Guitar,
  ticket: Ticket,
  trophy: Trophy,
  folder: Folder,
};

const icon = computed(() => iconMap[props.name] ?? Folder);
</script>

<template>
  <component :is="icon" :size="size ?? 16" />
</template>
