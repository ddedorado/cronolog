<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { useToast } from "@/composables/useToast";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Save,
  Loader2,
  LogOut,
  Trash2,
} from "lucide-vue-next";
import ConfirmModal from "@/components/ConfirmModal.vue";

const router = useRouter();
const { user, displayName, signOut } = useAuth();
const toast = useToast();

const newDisplayName = ref(displayName.value);
const newPassword = ref("");
const confirmPassword = ref("");
const saving = ref(false);
const showDeleteConfirm = ref(false);

const initials = computed(() => {
  const name = displayName.value;
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
});

const passwordsMatch = computed(
  () => !confirmPassword.value || newPassword.value === confirmPassword.value,
);

const canSaveProfile = computed(
  () =>
    newDisplayName.value.trim() &&
    newDisplayName.value.trim() !== displayName.value,
);

const canSavePassword = computed(
  () =>
    newPassword.value.length >= 6 &&
    newPassword.value === confirmPassword.value,
);

async function updateProfile() {
  if (!canSaveProfile.value) return;
  saving.value = true;
  try {
    const { error } = await supabase.auth.updateUser({
      data: { display_name: newDisplayName.value.trim() },
    });
    if (error) throw error;
    toast.success("Nombre actualizado");
  } catch (err: any) {
    toast.error(err?.message ?? "Error al actualizar perfil");
  } finally {
    saving.value = false;
  }
}

async function updatePassword() {
  if (!canSavePassword.value) return;
  saving.value = true;
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword.value,
    });
    if (error) throw error;
    newPassword.value = "";
    confirmPassword.value = "";
    toast.success("Contraseña actualizada");
  } catch (err: any) {
    toast.error(err?.message ?? "Error al cambiar contraseña");
  } finally {
    saving.value = false;
  }
}

async function handleDeleteAccount() {
  // Note: Supabase doesn't allow self-deletion via client API by default.
  // We sign out and notify the user to contact support.
  toast.info(
    "Cuenta marcada para eliminación. Contacta soporte para completar.",
  );
  await signOut();
  router.push("/auth");
}

async function handleSignOut() {
  await signOut();
  router.push("/auth");
}
</script>

<template>
  <div class="min-h-screen" style="background: var(--bg)">
    <!-- Header -->
    <header
      class="sticky top-0 z-40 backdrop-blur-md"
      style="
        background: color-mix(in srgb, var(--bg) 85%, transparent);
        border-bottom: 1px solid var(--border);
      "
    >
      <div class="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        <button
          @click="router.push('/')"
          class="p-2 rounded-lg transition-colors cursor-pointer"
          style="color: var(--text-muted)"
        >
          <ArrowLeft :size="18" />
        </button>
        <h1 class="font-display text-xl" style="color: var(--text)">Perfil</h1>
      </div>
    </header>

    <main class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <!-- Avatar + Name -->
      <div class="flex flex-col items-center mb-8 animate-fade-in">
        <div
          class="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-3"
          style="
            background: var(--bg-muted);
            color: var(--text-muted);
            border: 2px solid var(--border);
          "
        >
          {{ initials }}
        </div>
        <p class="font-display text-lg" style="color: var(--text)">
          {{ displayName }}
        </p>
        <p class="text-xs" style="color: var(--text-faint)">
          {{ user?.email }}
        </p>
      </div>

      <!-- Profile Section -->
      <section
        class="rounded-xl p-5 mb-4"
        style="background: var(--bg-elevated); border: 1px solid var(--border)"
      >
        <h2
          class="text-sm font-semibold mb-4 flex items-center gap-2"
          style="color: var(--text)"
        >
          <User :size="15" />
          Información personal
        </h2>

        <div class="flex flex-col gap-3">
          <!-- Email (readonly) -->
          <div>
            <label
              class="block text-xs font-medium mb-1.5"
              style="color: var(--text-muted)"
              >Email</label
            >
            <div class="relative">
              <Mail
                :size="15"
                class="absolute left-3 top-1/2 -translate-y-1/2"
                style="color: var(--text-faint)"
              />
              <input
                :value="user?.email"
                disabled
                class="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm opacity-60"
                style="
                  background: var(--bg-muted);
                  color: var(--text);
                  border: 1px solid var(--border);
                "
              />
            </div>
          </div>

          <!-- Display name -->
          <div>
            <label
              class="block text-xs font-medium mb-1.5"
              style="color: var(--text-muted)"
              >Nombre</label
            >
            <div class="relative">
              <User
                :size="15"
                class="absolute left-3 top-1/2 -translate-y-1/2"
                style="color: var(--text-faint)"
              />
              <input
                v-model="newDisplayName"
                type="text"
                class="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                style="
                  background: var(--bg-muted);
                  color: var(--text);
                  border: 1px solid var(--border);
                "
              />
            </div>
          </div>

          <button
            @click="updateProfile"
            :disabled="!canSaveProfile || saving"
            class="self-end flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            :style="{
              background:
                canSaveProfile && !saving ? 'var(--text)' : 'var(--border)',
              color:
                canSaveProfile && !saving ? 'var(--bg)' : 'var(--text-faint)',
            }"
          >
            <Loader2 v-if="saving" :size="13" class="animate-spin" />
            <Save v-else :size="13" />
            Guardar
          </button>
        </div>
      </section>

      <!-- Password Section -->
      <section
        class="rounded-xl p-5 mb-4"
        style="background: var(--bg-elevated); border: 1px solid var(--border)"
      >
        <h2
          class="text-sm font-semibold mb-4 flex items-center gap-2"
          style="color: var(--text)"
        >
          <Lock :size="15" />
          Cambiar contraseña
        </h2>

        <div class="flex flex-col gap-3">
          <div>
            <label
              class="block text-xs font-medium mb-1.5"
              style="color: var(--text-muted)"
              >Nueva contraseña</label
            >
            <input
              v-model="newPassword"
              type="password"
              placeholder="Mínimo 6 caracteres"
              autocomplete="new-password"
              class="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style="
                background: var(--bg-muted);
                color: var(--text);
                border: 1px solid var(--border);
              "
            />
          </div>

          <div>
            <label
              class="block text-xs font-medium mb-1.5"
              style="color: var(--text-muted)"
              >Confirmar contraseña</label
            >
            <input
              v-model="confirmPassword"
              type="password"
              placeholder="Repite la contraseña"
              autocomplete="new-password"
              class="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
              :style="{
                background: 'var(--bg-muted)',
                color: 'var(--text)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: !passwordsMatch ? '#ef4444' : 'var(--border)',
              }"
            />
            <p
              v-if="!passwordsMatch"
              class="text-[10px] mt-1"
              style="color: #ef4444"
            >
              Las contraseñas no coinciden
            </p>
          </div>

          <button
            @click="updatePassword"
            :disabled="!canSavePassword || saving"
            class="self-end flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            :style="{
              background:
                canSavePassword && !saving ? 'var(--text)' : 'var(--border)',
              color:
                canSavePassword && !saving ? 'var(--bg)' : 'var(--text-faint)',
            }"
          >
            <Loader2 v-if="saving" :size="13" class="animate-spin" />
            <Lock v-else :size="13" />
            Cambiar
          </button>
        </div>
      </section>

      <!-- Danger Zone -->
      <section
        class="rounded-xl p-5"
        style="
          background: var(--bg-elevated);
          border: 1px solid var(--danger-light);
        "
      >
        <h2 class="text-sm font-semibold mb-3" style="color: var(--danger)">
          Zona de peligro
        </h2>
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs" style="color: var(--text)">Cerrar sesión</p>
            <p class="text-[10px]" style="color: var(--text-faint)">
              Tus datos permanecen en la nube.
            </p>
          </div>
          <button
            @click="handleSignOut"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style="color: var(--text-muted); border: 1px solid var(--border)"
          >
            <LogOut :size="13" />
            Salir
          </button>
        </div>
        <div
          class="flex items-center justify-between gap-4 mt-3 pt-3"
          style="border-top: 1px solid var(--border)"
        >
          <div>
            <p class="text-xs" style="color: var(--text)">Eliminar cuenta</p>
            <p class="text-[10px]" style="color: var(--text-faint)">
              Esta acción es irreversible.
            </p>
          </div>
          <button
            @click="showDeleteConfirm = true"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style="color: var(--danger); border: 1px solid var(--danger-light)"
          >
            <Trash2 :size="13" />
            Eliminar
          </button>
        </div>
      </section>
    </main>

    <ConfirmModal
      v-if="showDeleteConfirm"
      title="¿Eliminar tu cuenta?"
      message="Se cerrará tu sesión y tu cuenta será marcada para eliminación. Esta acción no se puede deshacer."
      confirm-text="Eliminar cuenta"
      :danger="true"
      @confirm="handleDeleteAccount"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>
