<script setup lang="ts">
import {
  Moon,
  Sun,
  Download,
  Upload,
  Settings,
  Search,
  X,
  LogOut,
  Cloud,
  CloudOff,
  Loader2,
  Check,
  AlertTriangle,
  WifiOff,
} from "lucide-vue-next";
import { useCronologStore } from "@/stores/cronolog";
import { useAuth } from "@/composables/useAuth";
import {
  useSupabaseSync,
  type SyncStatus,
} from "@/composables/useSupabaseSync";
import { useRouter } from "vue-router";
import { ref, computed } from "vue";

const props = defineProps<{
  isDark: boolean;
  search: string;
}>();

const emit = defineEmits<{
  toggleDark: [];
  openSettings: [];
  openExport: [];
  openImport: [];
  "update:search": [value: string];
}>();

const store = useCronologStore();
const { displayName, signOut } = useAuth();
const { syncStatus, isOnline } = useSupabaseSync();
const router = useRouter();
const showSearch = ref(false);
const searchInput = ref<HTMLInputElement | null>(null);

const initials = computed(() => {
  const name = displayName.value;
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
});

const syncTooltip = computed(() => {
  const map: Record<SyncStatus, string> = {
    idle: "Sincronizado",
    saving: "Guardando...",
    saved: "Guardado ✓",
    error: "Error de sincronización",
    offline: "Sin conexión",
  };
  return map[syncStatus.value];
});

async function handleSignOut() {
  await signOut();
  router.push("/auth");
}

function toggleSearch() {
  showSearch.value = !showSearch.value;
  if (showSearch.value) {
    setTimeout(() => searchInput.value?.focus(), 50);
  } else {
    emit("update:search", "");
  }
}

function handleExport() {
  emit("openExport");
}

function handleImport() {
  emit("openImport");
}
</script>

<template>
  <header
    class="sticky top-0 z-40 backdrop-blur-md"
    style="
      background: color-mix(in srgb, var(--bg) 85%, transparent);
      border-bottom: 1px solid var(--border);
    "
  >
    <div
      class="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between"
    >
      <!-- Logo + breadcrumb -->
      <div class="flex items-center gap-2">
        <h1
          class="font-display text-2xl tracking-tight"
          style="color: var(--text)"
        >
          Cronolog
        </h1>
        <span
          v-if="store.hasYears"
          class="text-sm font-mono px-1.5 py-0.5 rounded-md"
          style="color: var(--text-faint); background: var(--bg-muted)"
        >
          {{ store.activeYear }}
        </span>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-0.5 sm:gap-1">
        <!-- Search -->
        <div class="flex items-center">
          <div
            v-if="showSearch"
            class="relative flex items-center animate-fade-in"
          >
            <input
              ref="searchInput"
              :value="search"
              @input="
                emit('update:search', ($event.target as HTMLInputElement).value)
              "
              @keydown.escape="toggleSearch"
              type="text"
              placeholder="Buscar..."
              class="w-32 sm:w-44 px-3 py-1.5 pr-7 rounded-lg text-sm outline-none transition-all"
              style="
                background: var(--bg-muted);
                color: var(--text);
                border: 1px solid var(--border);
              "
            />
            <button
              v-if="search"
              @click="
                emit('update:search', '');
                searchInput?.focus();
              "
              class="absolute right-1.5 p-0.5 rounded cursor-pointer"
              style="color: var(--text-faint)"
            >
              <X :size="14" />
            </button>
          </div>
          <button
            @click="toggleSearch"
            class="p-2 rounded-lg transition-colors cursor-pointer"
            :style="{ color: showSearch ? 'var(--text)' : 'var(--text-muted)' }"
            title="Buscar"
          >
            <Search :size="18" />
          </button>
        </div>

        <button
          @click="handleExport"
          class="p-2 rounded-lg transition-colors cursor-pointer hidden sm:flex"
          style="color: var(--text-muted)"
          title="Exportar datos"
        >
          <Download :size="18" />
        </button>

        <button
          @click="handleImport"
          class="p-2 rounded-lg transition-colors cursor-pointer hidden sm:flex"
          style="color: var(--text-muted)"
          title="Importar datos"
        >
          <Upload :size="18" />
        </button>

        <button
          @click="emit('openSettings')"
          class="p-2 rounded-lg transition-colors cursor-pointer"
          style="color: var(--text-muted)"
          title="Ajustes"
        >
          <Settings :size="18" />
        </button>

        <button
          @click="emit('toggleDark')"
          class="p-2 rounded-lg transition-colors cursor-pointer hidden sm:flex"
          style="color: var(--text-muted)"
          title="Cambiar tema"
        >
          <Moon v-if="!isDark" :size="18" />
          <Sun v-else :size="18" />
        </button>

        <!-- Sync status -->
        <div class="p-2 rounded-lg hidden sm:flex" :title="syncTooltip">
          <WifiOff
            v-if="!isOnline"
            :size="15"
            style="color: var(--text-faint)"
          />
          <Loader2
            v-else-if="syncStatus === 'saving'"
            :size="15"
            class="animate-spin"
            style="color: #3b82f6"
          />
          <Check
            v-else-if="syncStatus === 'saved'"
            :size="15"
            style="color: #22c55e"
          />
          <AlertTriangle
            v-else-if="syncStatus === 'error'"
            :size="15"
            style="color: #ef4444"
          />
          <Cloud v-else :size="15" style="color: var(--text-faint)" />
        </div>

        <!-- User / Logout -->
        <div
          class="flex items-center gap-1 ml-1 pl-1"
          style="border-left: 1px solid var(--border)"
        >
          <!-- Avatar (links to profile) -->
          <router-link
            to="/profile"
            class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 cursor-pointer transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text-muted);
              border: 1px solid var(--border);
            "
            title="Mi perfil"
          >
            {{ initials }}
          </router-link>
          <span
            v-if="displayName"
            class="text-xs font-medium px-1 hidden sm:inline"
            style="color: var(--text-muted)"
          >
            {{ displayName }}
          </span>
          <button
            @click="handleSignOut"
            class="p-2 rounded-lg transition-colors cursor-pointer hidden sm:flex"
            style="color: var(--text-muted)"
            title="Cerrar sesión"
          >
            <LogOut :size="18" />
          </button>
        </div>
      </div>
    </div>

    <!-- Offline banner -->
    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="-translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-full opacity-0"
    >
      <div
        v-if="!isOnline"
        class="flex items-center justify-center gap-2 py-1.5 text-xs font-medium"
        style="background: #f59e0b; color: #1c1917"
      >
        <WifiOff :size="13" />
        Sin conexión — los cambios se guardarán al reconectar
      </div>
    </Transition>
  </header>
</template>
