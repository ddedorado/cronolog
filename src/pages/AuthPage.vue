<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { useFirebaseSync } from "@/composables/useFirebaseSync";
import { useTheme } from "@/composables/useTheme";
import { validateInviteCode, redeemInviteCode, isInviteOnly, type InviteResult } from "@/utils/invite";
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Film,
  BookOpen,
  Gamepad2,
  Tv,
  Moon,
  Sun,
  Ticket,
} from "lucide-vue-next";

const router = useRouter();
const { signIn, signUp, signInWithGoogle, signOut, deleteCurrentUser, resetPassword } = useAuth();
const { loadFromCloud, startWatching, migrateLocalData } = useFirebaseSync();
const { isDark, toggleDark } = useTheme();

const mode = ref<"login" | "register" | "forgot">("login");
const email = ref("");
const password = ref("");
const displayName = ref("");
const inviteCode = ref("");
const showPassword = ref(false);
const loading = ref(false);
const error = ref("");
const success = ref("");
const showConfirmEmail = ref(false);

const requiresInvite = isInviteOnly();

// Inline validation (touched tracking)
const touched = ref({
  email: false,
  password: false,
  name: false,
  invite: false,
});

const emailValid = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()),
);
const emailError = computed(() => {
  if (!touched.value.email || !email.value.trim()) return "";
  return emailValid.value ? "" : "Email no válido";
});

// Async invite validation state
const inviteResult = ref<InviteResult | null>(null);
const inviteChecking = ref(false);
let inviteDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const inviteValid = computed(() => {
  if (!requiresInvite) return true;
  return inviteResult.value?.valid === true;
});
const inviteError = computed(() => {
  if (!requiresInvite || !touched.value.invite || !inviteCode.value.trim())
    return "";
  if (inviteChecking.value) return "";
  if (!inviteResult.value) return "";
  const reason = inviteResult.value.reason;
  if (reason === "exhausted") return "Código agotado";
  if (reason === "expired") return "Código expirado";
  return inviteResult.value.valid ? "" : "Código no válido";
});

// Debounced async validation as user types
watch(inviteCode, (code) => {
  if (inviteDebounceTimer) clearTimeout(inviteDebounceTimer);
  inviteResult.value = null;
  const trimmed = code.trim();
  if (!trimmed || !requiresInvite) return;
  inviteChecking.value = true;
  inviteDebounceTimer = setTimeout(async () => {
    inviteResult.value = await validateInviteCode(trimmed);
    inviteChecking.value = false;
  }, 400);
});

const passwordStrength = computed(() => {
  const p = password.value;
  if (!p) return 0;
  let score = 0;
  if (p.length >= 6) score++;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return Math.min(score, 4);
});

const strengthLabel = computed(() => {
  const labels = ["", "Débil", "Regular", "Buena", "Fuerte"];
  return labels[passwordStrength.value] ?? "";
});

const strengthColor = computed(() => {
  const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];
  return colors[passwordStrength.value] ?? "";
});

const passwordError = computed(() => {
  if (!touched.value.password || !password.value) return "";
  return password.value.length < 6 ? "Mínimo 6 caracteres" : "";
});

const isFormValid = computed(() => {
  if (!emailValid.value) return false;
  if (mode.value === "forgot") return true;
  if (!password.value || password.value.length < 6) return false;
  if (mode.value === "register") {
    if (!displayName.value.trim()) return false;
    if (requiresInvite && !inviteValid.value) return false;
  }
  return true;
});

// Reset touched on mode switch
watch(mode, () => {
  touched.value = { email: false, password: false, name: false, invite: false };
  error.value = "";
  success.value = "";
});

function inviteErrorMessage(result: InviteResult) {
  if (result.reason === "exhausted") {
    return "Este código de invitación ha agotado sus usos";
  }
  if (result.reason === "expired") {
    return "Este código de invitación ha expirado";
  }
  return "Código de invitación no válido";
}

async function validateInviteForRegistration() {
  if (!requiresInvite) return true;
  const result = await validateInviteCode(inviteCode.value);
  if (!result.valid) {
    error.value = inviteErrorMessage(result);
    touched.value.invite = true;
    return false;
  }
  return true;
}

async function redeemInviteForRegistration() {
  if (!requiresInvite) return true;
  const result = await redeemInviteCode(inviteCode.value);
  if (!result.valid) {
    error.value = inviteErrorMessage(result);
    return false;
  }
  return true;
}

async function handleSubmit() {
  if (!isFormValid.value) return;

  loading.value = true;
  error.value = "";
  success.value = "";

  try {
    if (mode.value === "login") {
      await signIn(email.value.trim(), password.value);
      await loadFromCloud();
      startWatching();
      router.push("/");
    } else if (mode.value === "register") {
      if (!(await validateInviteForRegistration())) return;
      await signUp(
        email.value.trim(),
        password.value,
        displayName.value.trim(),
      );

      if (!(await redeemInviteForRegistration())) {
        await deleteCurrentUser().catch(() => signOut());
        return;
      }

      await migrateLocalData();
      await loadFromCloud();
      startWatching();
      router.push("/");
    } else if (mode.value === "forgot") {
      await resetPassword(email.value.trim());
      success.value =
        "Se ha enviado un enlace de recuperación a tu correo electrónico.";
    }
  } catch (err: any) {
    const msg = err?.code ?? err?.message ?? "Error desconocido";
    if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("auth/user-not-found")) {
      error.value = "Email o contraseña incorrectos";
    } else if (msg.includes("auth/email-already-in-use")) {
      error.value = "Este email ya está registrado";
    } else if (msg.includes("auth/too-many-requests")) {
      error.value = "Demasiados intentos. Intenta más tarde.";
    } else if (msg.includes("auth/weak-password")) {
      error.value = "La contraseña es demasiado débil";
    } else {
      error.value = err?.message ?? msg;
    }
  } finally {
    loading.value = false;
  }
}

async function handleGoogleLogin() {
  loading.value = true;
  error.value = "";
  try {
    if (mode.value === "register" && !(await validateInviteForRegistration())) {
      return;
    }

    const googleResult = await signInWithGoogle();

    if (
      mode.value === "register" &&
      googleResult.isNewUser &&
      !(await redeemInviteForRegistration())
    ) {
      await deleteCurrentUser().catch(() => signOut());
      return;
    }

    await loadFromCloud();
    startWatching();
    router.push("/");
  } catch (err: any) {
    error.value = err?.message ?? "Error al iniciar con Google";
  } finally {
    loading.value = false;
  }
}

function switchMode(newMode: "login" | "register" | "forgot") {
  mode.value = newMode;
  showConfirmEmail.value = false;
}
</script>

<template>
  <div
    class="flex items-center justify-center px-4 relative overflow-hidden"
    style="background: var(--bg); min-height: 100dvh"
  >
    <!-- Decorative background -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <!-- Floating category icons -->
      <Film
        :size="120"
        class="absolute -top-4 -left-8 opacity-[0.03] rotate-12"
        style="color: var(--text)"
      />
      <BookOpen
        :size="100"
        class="absolute top-1/4 -right-6 opacity-[0.03] -rotate-12"
        style="color: var(--text)"
      />
      <Gamepad2
        :size="90"
        class="absolute bottom-1/4 -left-4 opacity-[0.03] rotate-6"
        style="color: var(--text)"
      />
      <Tv
        :size="80"
        class="absolute -bottom-4 right-1/4 opacity-[0.03] -rotate-6"
        style="color: var(--text)"
      />
      <!-- Gradient mesh -->
      <div
        class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
        style="
          background: radial-gradient(
            circle,
            rgba(59, 130, 246, 0.06) 0%,
            transparent 70%
          );
          filter: blur(60px);
        "
      />
      <div
        class="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full"
        style="
          background: radial-gradient(
            circle,
            rgba(34, 197, 94, 0.04) 0%,
            transparent 70%
          );
          filter: blur(40px);
        "
      />
    </div>

    <div class="w-full max-w-sm animate-fade-in relative z-10">
      <!-- Dark mode toggle (top-right) -->
      <button
        @click="toggleDark()"
        class="absolute -top-10 right-0 p-2 rounded-lg transition-colors cursor-pointer"
        style="color: var(--text-faint)"
        title="Cambiar tema"
      >
        <Moon v-if="!isDark" :size="16" />
        <Sun v-else :size="16" />
      </button>

      <!-- Logo -->
      <div class="text-center mb-8">
        <h1
          class="font-display text-4xl tracking-tight"
          style="color: var(--text)"
        >
          Cronolog
        </h1>
        <p class="text-sm mt-2" style="color: var(--text-muted)">
          Tu tracker personal de entretenimiento
        </p>
        <!-- Category pills -->
        <div class="flex items-center justify-center gap-1.5 mt-3">
          <span
            class="text-[10px] px-2 py-0.5 rounded-full"
            style="background: #3b82f620; color: #3b82f6"
            >Películas</span
          >
          <span
            class="text-[10px] px-2 py-0.5 rounded-full"
            style="background: #22c55e20; color: #22c55e"
            >Libros</span
          >
          <span
            class="text-[10px] px-2 py-0.5 rounded-full"
            style="background: #eab30820; color: #eab308"
            >TV</span
          >
          <span
            class="text-[10px] px-2 py-0.5 rounded-full"
            style="background: #f9731620; color: #f97316"
            >Juegos</span
          >
        </div>
      </div>

      <!-- Confirm Email Screen -->
      <div
        v-if="showConfirmEmail"
        class="rounded-2xl p-6 text-center"
        style="
          background: var(--bg-elevated);
          box-shadow: var(--shadow-modal);
          border: 1px solid var(--border);
        "
      >
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style="background: #3b82f615"
        >
          <Mail :size="28" style="color: #3b82f6" />
        </div>
        <h2 class="font-display text-xl" style="color: var(--text)">
          Revisa tu correo
        </h2>
        <p
          class="text-sm mt-2 leading-relaxed"
          style="color: var(--text-muted)"
        >
          Hemos enviado un enlace de confirmación a
          <strong style="color: var(--text)">{{ email }}</strong
          >. Haz clic en él para activar tu cuenta.
        </p>
        <button
          @click="switchMode('login')"
          class="mt-6 w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
          style="background: var(--text); color: var(--bg)"
        >
          Ya confirmé, iniciar sesión
        </button>
        <p class="text-[10px] mt-3" style="color: var(--text-faint)">
          ¿No ves el correo? Revisa tu carpeta de spam.
        </p>
      </div>

      <!-- Card -->
      <div
        v-else
        class="rounded-2xl p-6"
        style="
          background: var(--bg-elevated);
          box-shadow: var(--shadow-modal);
          border: 1px solid var(--border);
        "
      >
        <!-- Tabs -->
        <div
          v-if="mode !== 'forgot'"
          class="flex gap-1 p-1 rounded-xl mb-6"
          style="background: var(--bg-muted)"
        >
          <button
            @click="switchMode('login')"
            class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            :style="{
              background:
                mode === 'login' ? 'var(--bg-elevated)' : 'transparent',
              color: mode === 'login' ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: mode === 'login' ? 'var(--shadow-card)' : 'none',
            }"
          >
            <LogIn :size="14" />
            Entrar
          </button>
          <button
            @click="switchMode('register')"
            class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            :style="{
              background:
                mode === 'register' ? 'var(--bg-elevated)' : 'transparent',
              color: mode === 'register' ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: mode === 'register' ? 'var(--shadow-card)' : 'none',
            }"
          >
            <UserPlus :size="14" />
            Crear cuenta
          </button>
        </div>

        <!-- Forgot password header -->
        <div v-if="mode === 'forgot'" class="mb-6">
          <h2 class="font-display text-xl" style="color: var(--text)">
            Recuperar contraseña
          </h2>
          <p class="text-xs mt-1" style="color: var(--text-muted)">
            Te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 text-xs"
          style="background: var(--danger-light); color: var(--danger)"
        >
          <AlertCircle :size="14" class="flex-shrink-0" />
          {{ error }}
        </div>

        <!-- Success -->
        <div
          v-if="success"
          class="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 text-xs"
          style="background: #22c55e15; color: #22c55e"
        >
          <CheckCircle2 :size="14" class="flex-shrink-0" />
          {{ success }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="flex flex-col gap-3.5">
          <!-- Display name (register only) -->
          <div v-if="mode === 'register'">
            <label
              class="block text-xs font-medium mb-1.5"
              style="color: var(--text-muted)"
            >
              Nombre
            </label>
            <div class="relative">
              <User
                :size="15"
                class="absolute left-3 top-1/2 -translate-y-1/2"
                style="color: var(--text-faint)"
              />
              <input
                v-model="displayName"
                type="text"
                placeholder="Tu nombre"
                autocomplete="name"
                @blur="touched.name = true"
                class="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style="
                  background: var(--bg-muted);
                  color: var(--text);
                  border: 1px solid var(--border);
                "
              />
            </div>
          </div>

          <!-- Email -->
          <div>
            <label
              class="block text-xs font-medium mb-1.5"
              style="color: var(--text-muted)"
            >
              Email
            </label>
            <div class="relative">
              <Mail
                :size="15"
                class="absolute left-3 top-1/2 -translate-y-1/2"
                style="color: var(--text-faint)"
              />
              <input
                v-model="email"
                type="email"
                placeholder="tu@email.com"
                autocomplete="email"
                required
                @blur="touched.email = true"
                class="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                :style="{
                  background: 'var(--bg-muted)',
                  color: 'var(--text)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: emailError ? '#ef4444' : 'var(--border)',
                }"
              />
            </div>
            <p
              v-if="emailError"
              class="text-[10px] mt-1"
              style="color: #ef4444"
            >
              {{ emailError }}
            </p>
          </div>

          <!-- Password -->
          <div v-if="mode !== 'forgot'">
            <label
              class="block text-xs font-medium mb-1.5"
              style="color: var(--text-muted)"
            >
              Contraseña
            </label>
            <div class="relative">
              <Lock
                :size="15"
                class="absolute left-3 top-1/2 -translate-y-1/2"
                style="color: var(--text-faint)"
              />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="
                  mode === 'register' ? 'Mínimo 6 caracteres' : 'Tu contraseña'
                "
                :autocomplete="
                  mode === 'register' ? 'new-password' : 'current-password'
                "
                required
                minlength="6"
                @blur="touched.password = true"
                class="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm outline-none transition-colors"
                :style="{
                  background: 'var(--bg-muted)',
                  color: 'var(--text)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: passwordError ? '#ef4444' : 'var(--border)',
                }"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer"
                style="color: var(--text-faint)"
              >
                <EyeOff v-if="showPassword" :size="15" />
                <Eye v-else :size="15" />
              </button>
            </div>
            <p
              v-if="passwordError"
              class="text-[10px] mt-1"
              style="color: #ef4444"
            >
              {{ passwordError }}
            </p>
            <!-- Password strength (register only) -->
            <div
              v-if="mode === 'register' && password.length > 0"
              class="mt-1.5"
            >
              <div class="flex gap-1">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="h-1 flex-1 rounded-full transition-colors"
                  :style="{
                    background:
                      i <= passwordStrength ? strengthColor : 'var(--border)',
                  }"
                />
              </div>
              <p class="text-[10px] mt-0.5" :style="{ color: strengthColor }">
                {{ strengthLabel }}
              </p>
            </div>
          </div>

          <!-- Invite code (register only, when invite-only mode is active) -->
          <div v-if="mode === 'register' && requiresInvite">
            <label
              class="block text-xs font-medium mb-1.5"
              style="color: var(--text-muted)"
            >
              Código de invitación
            </label>
            <div class="relative">
              <Ticket
                :size="15"
                class="absolute left-3 top-1/2 -translate-y-1/2"
                style="color: var(--text-faint)"
              />
              <input
                v-model="inviteCode"
                type="text"
                placeholder="Introduce tu código"
                autocomplete="off"
                @blur="touched.invite = true"
                class="w-full pl-9 pr-9 py-2.5 rounded-lg text-sm outline-none transition-colors uppercase tracking-wider"
                :style="{
                  background: 'var(--bg-muted)',
                  color: 'var(--text)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: inviteError
                    ? '#ef4444'
                    : touched.invite && inviteValid && inviteCode.trim()
                      ? '#22c55e'
                      : 'var(--border)',
                }"
              />
              <Loader2
                v-if="inviteChecking"
                :size="15"
                class="absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
                style="color: var(--text-faint)"
              />
              <CheckCircle2
                v-else-if="touched.invite && inviteValid && inviteCode.trim()"
                :size="15"
                class="absolute right-3 top-1/2 -translate-y-1/2"
                style="color: #22c55e"
              />
            </div>
            <p
              v-if="inviteError"
              class="text-[10px] mt-1"
              style="color: #ef4444"
            >
              {{ inviteError }}
            </p>
            <p v-else-if="inviteResult?.valid && inviteResult.remaining != null" class="text-[10px] mt-1" style="color: #22c55e">
              Código válido · {{ inviteResult.remaining }} {{ inviteResult.remaining === 1 ? 'uso restante' : 'usos restantes' }}
            </p>
            <p v-else class="text-[10px] mt-1" style="color: var(--text-faint)">
              Necesitas un código para crear tu cuenta.
            </p>
          </div>

          <!-- Forgot password link -->
          <div v-if="mode === 'login'" class="flex justify-end -mt-1">
            <button
              type="button"
              @click="switchMode('forgot')"
              class="text-xs cursor-pointer"
              style="color: var(--text-faint)"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="!isFormValid || loading"
            class="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            :style="{
              background:
                isFormValid && !loading ? 'var(--text)' : 'var(--border)',
              color:
                isFormValid && !loading ? 'var(--bg)' : 'var(--text-faint)',
            }"
          >
            <Loader2 v-if="loading" :size="15" class="animate-spin" />
            <template v-if="mode === 'login'">Iniciar sesión</template>
            <template v-else-if="mode === 'register'">Crear cuenta</template>
            <template v-else>Enviar enlace</template>
          </button>
        </form>

        <!-- Divider -->
        <div v-if="mode !== 'forgot'" class="flex items-center gap-3 my-4">
          <div class="flex-1 h-px" style="background: var(--border)" />
          <span
            class="text-[10px] uppercase tracking-wider"
            style="color: var(--text-faint)"
          >
            o continúa con
          </span>
          <div class="flex-1 h-px" style="background: var(--border)" />
        </div>

        <!-- Google -->
        <button
          v-if="mode !== 'forgot'"
          @click="handleGoogleLogin"
          :disabled="loading"
          class="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          style="
            background: var(--bg-muted);
            color: var(--text);
            border: 1px solid var(--border);
          "
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>

        <!-- Back to login from forgot -->
        <button
          v-if="mode === 'forgot'"
          @click="switchMode('login')"
          class="w-full mt-4 text-xs text-center cursor-pointer"
          style="color: var(--text-muted)"
        >
          ← Volver al inicio de sesión
        </button>
      </div>

      <!-- Footer -->
      <p class="text-center text-[10px] mt-6" style="color: var(--text-faint)">
        Tus datos se sincronizan de forma segura en la nube.
      </p>
    </div>
  </div>
</template>
