<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { useTheme } from "@/composables/useTheme";
import { Home, User, Moon, Sun, Settings, LogOut } from "lucide-vue-next";

const emit = defineEmits<{
  openSettings: [];
}>();

const router = useRouter();
const route = useRoute();
const { signOut } = useAuth();
const { isDark, toggleDark } = useTheme();

async function handleSignOut() {
  await signOut();
  router.push("/auth");
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 sm:hidden pb-safe"
    style="
      background: color-mix(in srgb, var(--bg-elevated) 95%, transparent);
      backdrop-filter: blur(12px);
      border-top: 1px solid var(--border);
    "
  >
    <div class="flex items-center justify-around h-14 px-2">
      <button
        @click="router.push('/')"
        class="flex flex-col items-center gap-0.5 p-2 rounded-lg cursor-pointer min-w-[48px] min-h-[48px] justify-center"
        :style="{
          color: route.path === '/' ? 'var(--text)' : 'var(--text-faint)',
        }"
      >
        <Home :size="20" />
        <span class="text-[9px]">Inicio</span>
      </button>

      <button
        @click="emit('openSettings')"
        class="flex flex-col items-center gap-0.5 p-2 rounded-lg cursor-pointer min-w-[48px] min-h-[48px] justify-center"
        style="color: var(--text-faint)"
      >
        <Settings :size="20" />
        <span class="text-[9px]">Ajustes</span>
      </button>

      <button
        @click="toggleDark()"
        class="flex flex-col items-center gap-0.5 p-2 rounded-lg cursor-pointer min-w-[48px] min-h-[48px] justify-center"
        style="color: var(--text-faint)"
      >
        <Moon v-if="!isDark" :size="20" />
        <Sun v-else :size="20" />
        <span class="text-[9px]">Tema</span>
      </button>

      <button
        @click="router.push('/profile')"
        class="flex flex-col items-center gap-0.5 p-2 rounded-lg cursor-pointer min-w-[48px] min-h-[48px] justify-center"
        :style="{
          color:
            route.path === '/profile' ? 'var(--text)' : 'var(--text-faint)',
        }"
      >
        <User :size="20" />
        <span class="text-[9px]">Perfil</span>
      </button>

      <button
        @click="handleSignOut"
        class="flex flex-col items-center gap-0.5 p-2 rounded-lg cursor-pointer min-w-[48px] min-h-[48px] justify-center"
        style="color: var(--text-faint)"
      >
        <LogOut :size="20" />
        <span class="text-[9px]">Salir</span>
      </button>
    </div>
  </nav>
</template>
