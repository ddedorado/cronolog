<script setup lang="ts">
import { ref } from "vue";
import { useSettingsStore } from "@/stores/settings";
import {
  X,
  Eye,
  EyeOff,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-vue-next";
import { verifyTMDBKey } from "@/services/enrichment/tmdb";
import { verifyRAWGKey } from "@/services/enrichment/rawg";

const emit = defineEmits<{ close: [] }>();
const settings = useSettingsStore();

const tmdbKey = ref(settings.apiKeys.tmdb);
const rawgKey = ref(settings.apiKeys.rawg);
const autoEnrich = ref(settings.autoEnrich);

const showTmdbKey = ref(false);
const showRawgKey = ref(false);

const tmdbStatus = ref<"idle" | "loading" | "ok" | "error">("idle");
const rawgStatus = ref<"idle" | "loading" | "ok" | "error">("idle");

const showTmdbHelp = ref(false);
const showRawgHelp = ref(false);

async function verifyTmdb() {
  if (!tmdbKey.value.trim()) return;
  tmdbStatus.value = "loading";
  const ok = await verifyTMDBKey(tmdbKey.value.trim());
  tmdbStatus.value = ok ? "ok" : "error";
}

async function verifyRawg() {
  if (!rawgKey.value.trim()) return;
  rawgStatus.value = "loading";
  const ok = await verifyRAWGKey(rawgKey.value.trim());
  rawgStatus.value = ok ? "ok" : "error";
}

function save() {
  settings.apiKeys = {
    tmdb: tmdbKey.value.trim(),
    rawg: rawgKey.value.trim(),
  };
  settings.autoEnrich = autoEnrich.value;
  emit("close");
}

function handleBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains("modal-backdrop")) {
    emit("close");
  }
}
</script>

<template>
  <div
    class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    style="background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px)"
    @click="handleBackdropClick"
  >
    <div
      class="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl p-6 animate-scale-in"
      style="
        background: var(--bg-elevated);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      "
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-display text-xl" style="color: var(--text)">Ajustes</h2>
        <button
          @click="emit('close')"
          class="p-1 rounded-md cursor-pointer"
          style="color: var(--text-faint)"
        >
          <X :size="18" />
        </button>
      </div>

      <!-- Auto-enrich toggle -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <p class="text-sm font-medium" style="color: var(--text)">
            Auto-enriquecer al crear
          </p>
          <p class="text-xs mt-0.5" style="color: var(--text-muted)">
            Busca automáticamente imagen, año y datos al añadir un elemento
          </p>
        </div>
        <button
          @click="autoEnrich = !autoEnrich"
          class="relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer"
          :style="{
            background: autoEnrich ? '#3B82F6' : 'var(--bg-muted)',
          }"
        >
          <span
            class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200"
            :style="{
              transform: autoEnrich ? 'translateX(20px)' : 'translateX(0)',
            }"
          />
        </button>
      </div>

      <hr style="border-color: var(--border)" class="mb-6" />

      <!-- API Keys section -->
      <h3 class="text-sm font-semibold mb-4" style="color: var(--text)">
        Claves de API
      </h3>

      <!-- TMDB -->
      <div class="mb-5">
        <div class="flex items-center gap-1.5 mb-1.5">
          <label class="text-xs font-medium" style="color: var(--text-muted)">
            TMDB — Películas y TV
          </label>
          <button
            @click="showTmdbHelp = !showTmdbHelp"
            class="p-0 cursor-pointer"
            style="color: var(--text-faint)"
          >
            <HelpCircle :size="13" />
          </button>
        </div>

        <!-- Tooltip -->
        <div
          v-if="showTmdbHelp"
          class="text-xs p-2.5 rounded-lg mb-2"
          style="
            background: var(--bg-muted);
            color: var(--text-muted);
            border: 1px solid var(--border);
          "
        >
          <ol class="list-decimal list-inside space-y-1">
            <li>
              Ve a
              <a
                href="https://www.themoviedb.org/signup"
                target="_blank"
                rel="noopener"
                class="underline"
                style="color: #3b82f6"
                >themoviedb.org/signup</a
              >
              y crea una cuenta gratuita
            </li>
            <li>Ve a <strong>Perfil → Configuración → API</strong></li>
            <li>Solicita una clave API (tipo "Developer")</li>
            <li>Copia la <strong>API Key (v3 auth)</strong> y pégala aquí</li>
          </ol>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <input
              v-model="tmdbKey"
              :type="showTmdbKey ? 'text' : 'password'"
              placeholder="API Key v3..."
              class="w-full px-3 py-2 pr-9 rounded-lg text-sm outline-none"
              style="
                background: var(--bg-muted);
                color: var(--text);
                border: 1px solid var(--border);
              "
              @input="tmdbStatus = 'idle'"
            />
            <button
              type="button"
              @click="showTmdbKey = !showTmdbKey"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer"
              style="color: var(--text-faint)"
            >
              <EyeOff v-if="showTmdbKey" :size="14" />
              <Eye v-else :size="14" />
            </button>
          </div>
          <button
            @click="verifyTmdb"
            class="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text-muted);
              border: 1px solid var(--border);
            "
            :disabled="!tmdbKey.trim()"
          >
            <Loader2
              v-if="tmdbStatus === 'loading'"
              :size="14"
              class="animate-spin"
            />
            <CheckCircle2
              v-else-if="tmdbStatus === 'ok'"
              :size="14"
              style="color: #22c55e"
            />
            <XCircle
              v-else-if="tmdbStatus === 'error'"
              :size="14"
              style="color: #ef4444"
            />
            <span v-else>Verificar</span>
          </button>
        </div>
      </div>

      <!-- RAWG -->
      <div class="mb-5">
        <div class="flex items-center gap-1.5 mb-1.5">
          <label class="text-xs font-medium" style="color: var(--text-muted)">
            RAWG — Videojuegos
          </label>
          <button
            @click="showRawgHelp = !showRawgHelp"
            class="p-0 cursor-pointer"
            style="color: var(--text-faint)"
          >
            <HelpCircle :size="13" />
          </button>
        </div>

        <div
          v-if="showRawgHelp"
          class="text-xs p-2.5 rounded-lg mb-2"
          style="
            background: var(--bg-muted);
            color: var(--text-muted);
            border: 1px solid var(--border);
          "
        >
          <ol class="list-decimal list-inside space-y-1">
            <li>
              Ve a
              <a
                href="https://rawg.io/apidocs"
                target="_blank"
                rel="noopener"
                class="underline"
                style="color: #3b82f6"
                >rawg.io/apidocs</a
              >
            </li>
            <li>Haz click en <strong>"Get API Key"</strong></li>
            <li>Regístrate con tu email (es gratis)</li>
            <li>Copia la API key y pégala aquí</li>
          </ol>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <input
              v-model="rawgKey"
              :type="showRawgKey ? 'text' : 'password'"
              placeholder="API Key..."
              class="w-full px-3 py-2 pr-9 rounded-lg text-sm outline-none"
              style="
                background: var(--bg-muted);
                color: var(--text);
                border: 1px solid var(--border);
              "
              @input="rawgStatus = 'idle'"
            />
            <button
              type="button"
              @click="showRawgKey = !showRawgKey"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer"
              style="color: var(--text-faint)"
            >
              <EyeOff v-if="showRawgKey" :size="14" />
              <Eye v-else :size="14" />
            </button>
          </div>
          <button
            @click="verifyRawg"
            class="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text-muted);
              border: 1px solid var(--border);
            "
            :disabled="!rawgKey.trim()"
          >
            <Loader2
              v-if="rawgStatus === 'loading'"
              :size="14"
              class="animate-spin"
            />
            <CheckCircle2
              v-else-if="rawgStatus === 'ok'"
              :size="14"
              style="color: #22c55e"
            />
            <XCircle
              v-else-if="rawgStatus === 'error'"
              :size="14"
              style="color: #ef4444"
            />
            <span v-else>Verificar</span>
          </button>
        </div>
      </div>

      <!-- Open Library -->
      <div class="mb-6">
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium" style="color: var(--text-muted)">
            Open Library — Libros
          </label>
          <span
            class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
            style="background: #22c55e15; color: #22c55e"
          >
            <CheckCircle2 :size="10" />
            Sin clave necesaria
          </span>
        </div>
      </div>

      <!-- Save -->
      <button
        @click="save"
        class="w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
        style="background: var(--text); color: var(--bg)"
      >
        Guardar ajustes
      </button>
    </div>
  </div>
</template>
