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
import { verifyGoogleBooksKey } from "@/services/enrichment/googlebooks";
import { verifyComicVineKey } from "@/services/enrichment/comicvine";

const emit = defineEmits<{ close: [] }>();
const settings = useSettingsStore();

const tmdbKey = ref(settings.apiKeys.tmdb ?? "");
const rawgKey = ref(settings.apiKeys.rawg ?? "");
const googlebooksKey = ref(settings.apiKeys.googlebooks ?? "");
const comicvineKey = ref(settings.apiKeys.comicvine ?? "");
const autoEnrich = ref(settings.autoEnrich);
const accentColor = ref(settings.accentColor);

const accentColors = [
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#06B6D4",
];

const showTmdbKey = ref(false);
const showRawgKey = ref(false);
const showGooglebooksKey = ref(false);
const showComicvineKey = ref(false);

const tmdbStatus = ref<"idle" | "loading" | "ok" | "error">("idle");
const rawgStatus = ref<"idle" | "loading" | "ok" | "error">("idle");
const googlebooksStatus = ref<"idle" | "loading" | "ok" | "error">("idle");
const comicvineStatus = ref<"idle" | "loading" | "ok" | "error">("idle");

const showTmdbHelp = ref(false);
const showRawgHelp = ref(false);
const showGooglebooksHelp = ref(false);
const showComicvineHelp = ref(false);

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

async function verifyGooglebooks() {
  if (!googlebooksKey.value.trim()) return;
  googlebooksStatus.value = "loading";
  const ok = await verifyGoogleBooksKey(googlebooksKey.value.trim());
  googlebooksStatus.value = ok ? "ok" : "error";
}

async function verifyComicvine() {
  if (!comicvineKey.value.trim()) return;
  comicvineStatus.value = "loading";
  const ok = await verifyComicVineKey(comicvineKey.value.trim());
  comicvineStatus.value = ok ? "ok" : "error";
}

function save() {
  settings.apiKeys = {
    tmdb: tmdbKey.value.trim(),
    rawg: rawgKey.value.trim(),
    googlebooks: googlebooksKey.value.trim(),
    comicvine: comicvineKey.value.trim(),
  };
  settings.autoEnrich = autoEnrich.value;
  settings.accentColor = accentColor.value;
  document.documentElement.style.setProperty("--accent", accentColor.value);
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
        -webkit-overflow-scrolling: touch;
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

      <!-- Google Books (optional key) -->
      <div class="mb-5">
        <div class="flex items-center gap-1.5 mb-1.5">
          <label class="text-xs font-medium" style="color: var(--text-muted)">
            Google Books — Libros
          </label>
          <span
            class="text-[10px] px-1.5 py-0.5 rounded"
            style="background: #3b82f615; color: #3b82f6"
          >
            Opcional
          </span>
          <button
            @click="showGooglebooksHelp = !showGooglebooksHelp"
            class="p-0 cursor-pointer"
            style="color: var(--text-faint)"
          >
            <HelpCircle :size="13" />
          </button>
        </div>

        <div
          v-if="showGooglebooksHelp"
          class="text-xs p-2.5 rounded-lg mb-2"
          style="
            background: var(--bg-muted);
            color: var(--text-muted);
            border: 1px solid var(--border);
          "
        >
          <p class="mb-1">
            Funciona sin clave (límite 1.000 consultas/día). Para más uso:
          </p>
          <ol class="list-decimal list-inside space-y-1">
            <li>
              Ve a
              <a
                href="https://console.cloud.google.com/apis/library/books.googleapis.com"
                target="_blank"
                rel="noopener"
                class="underline"
                style="color: #3b82f6"
                >Google Cloud Console</a
              >
            </li>
            <li>Habilita la <strong>Books API</strong></li>
            <li>
              Ve a <strong>Credenciales → Crear credencial → API key</strong>
            </li>
            <li>Pega la clave aquí</li>
          </ol>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <input
              v-model="googlebooksKey"
              :type="showGooglebooksKey ? 'text' : 'password'"
              placeholder="API Key (opcional)..."
              class="w-full px-3 py-2 pr-9 rounded-lg text-sm outline-none"
              style="
                background: var(--bg-muted);
                color: var(--text);
                border: 1px solid var(--border);
              "
              @input="googlebooksStatus = 'idle'"
            />
            <button
              type="button"
              @click="showGooglebooksKey = !showGooglebooksKey"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer"
              style="color: var(--text-faint)"
            >
              <EyeOff v-if="showGooglebooksKey" :size="14" />
              <Eye v-else :size="14" />
            </button>
          </div>
          <button
            @click="verifyGooglebooks"
            class="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text-muted);
              border: 1px solid var(--border);
            "
            :disabled="!googlebooksKey.trim()"
          >
            <Loader2
              v-if="googlebooksStatus === 'loading'"
              :size="14"
              class="animate-spin"
            />
            <CheckCircle2
              v-else-if="googlebooksStatus === 'ok'"
              :size="14"
              style="color: #22c55e"
            />
            <XCircle
              v-else-if="googlebooksStatus === 'error'"
              :size="14"
              style="color: #ef4444"
            />
            <span v-else>Verificar</span>
          </button>
        </div>
      </div>

      <!-- Comic Vine -->
      <div class="mb-5">
        <div class="flex items-center gap-1.5 mb-1.5">
          <label class="text-xs font-medium" style="color: var(--text-muted)">
            Comic Vine — Cómics
          </label>
          <button
            @click="showComicvineHelp = !showComicvineHelp"
            class="p-0 cursor-pointer"
            style="color: var(--text-faint)"
          >
            <HelpCircle :size="13" />
          </button>
        </div>

        <div
          v-if="showComicvineHelp"
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
                href="https://comicvine.gamespot.com/api/"
                target="_blank"
                rel="noopener"
                class="underline"
                style="color: #3b82f6"
                >comicvine.gamespot.com/api</a
              >
            </li>
            <li>Regístrate o inicia sesión</li>
            <li>Copia tu <strong>API Key</strong></li>
          </ol>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <input
              v-model="comicvineKey"
              :type="showComicvineKey ? 'text' : 'password'"
              placeholder="API Key..."
              class="w-full px-3 py-2 pr-9 rounded-lg text-sm outline-none"
              style="
                background: var(--bg-muted);
                color: var(--text);
                border: 1px solid var(--border);
              "
              @input="comicvineStatus = 'idle'"
            />
            <button
              type="button"
              @click="showComicvineKey = !showComicvineKey"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer"
              style="color: var(--text-faint)"
            >
              <EyeOff v-if="showComicvineKey" :size="14" />
              <Eye v-else :size="14" />
            </button>
          </div>
          <button
            @click="verifyComicvine"
            class="px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style="
              background: var(--bg-muted);
              color: var(--text-muted);
              border: 1px solid var(--border);
            "
            :disabled="!comicvineKey.trim()"
          >
            <Loader2
              v-if="comicvineStatus === 'loading'"
              :size="14"
              class="animate-spin"
            />
            <CheckCircle2
              v-else-if="comicvineStatus === 'ok'"
              :size="14"
              style="color: #22c55e"
            />
            <XCircle
              v-else-if="comicvineStatus === 'error'"
              :size="14"
              style="color: #ef4444"
            />
            <span v-else>Verificar</span>
          </button>
        </div>
      </div>

      <!-- No-key sources -->
      <div class="mb-6 space-y-2">
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium" style="color: var(--text-muted)">
            MusicBrainz — Música
          </label>
          <span
            class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
            style="background: #22c55e15; color: #22c55e"
          >
            <CheckCircle2 :size="10" />
            Sin clave
          </span>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs font-medium" style="color: var(--text-muted)">
            Jikan (MAL) — Anime y Manga
          </label>
          <span
            class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
            style="background: #22c55e15; color: #22c55e"
          >
            <CheckCircle2 :size="10" />
            Sin clave
          </span>
        </div>
      </div>

      <hr style="border-color: var(--border)" class="mb-6" />

      <!-- Accent Color -->
      <h3 class="text-sm font-semibold mb-3" style="color: var(--text)">
        Color de acento
      </h3>
      <div class="flex flex-wrap gap-2 mb-6">
        <button
          v-for="color in accentColors"
          :key="color"
          @click="accentColor = color"
          class="w-7 h-7 rounded-full cursor-pointer transition-transform"
          :style="{
            background: color,
            transform: accentColor === color ? 'scale(1.2)' : 'scale(1)',
            boxShadow:
              accentColor === color
                ? `0 0 0 2px var(--bg-elevated), 0 0 0 4px ${color}`
                : 'none',
          }"
        />
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
