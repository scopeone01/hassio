<template>
  <div class="login-view">
    <div class="login-card">
      <div class="logo-section">
        <div class="logo">🏢</div>
        <h1>FacilityMaster</h1>
        <p class="subtitle">Ticket System</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">E-Mail</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="ihre.email@example.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label for="password">Passwort</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" class="login-btn" :disabled="isLoading">
          <span v-if="isLoading">Anmeldung läuft...</span>
          <span v-else>Anmelden</span>
        </button>
      </form>

      <div class="help-text">
        <p>Bei Problemen wenden Sie sich bitte an Ihren Administrator.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAppStore } from '../stores/app'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const form = ref({
  email: '',
  password: ''
})

const isLoading = ref(false)
const error = ref(null)

async function handleLogin() {
  if (isLoading.value) return
  
  try {
    isLoading.value = true
    error.value = null
    
    const result = await authStore.login(form.value.email, form.value.password)
    
    if (result.success) {
      // Auto-select project if only one, otherwise show project selection
      if (result.autoSelectedProject) {
        // User has only one project, auto-select it
        appStore.setCurrentProject(result.autoSelectedProject)
        router.push('/')
      } else if (result.requiresProjectSelection) {
        // User has multiple projects, show selection
        router.push('/projects')
      } else {
        // No projects assigned
        error.value = 'Kein Projekt zugewiesen. Bitte wenden Sie sich an Ihren Administrator.'
      }
    } else {
      error.value = result.message
    }
  } catch (err) {
    error.value = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
    console.error(err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 20px;
  padding: 48px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.logo-section {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  font-size: 64px;
  line-height: 1;
  margin-bottom: 16px;
}

h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 16px;
  color: #86868b;
}

.login-form {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  margin-bottom: 8px;
}

input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #d1d1d6;
  border-radius: 10px;
  font-size: 16px;
  transition: all 0.2s;
}

input:focus {
  outline: none;
  border-color: #007aff;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.error-message {
  padding: 12px 16px;
  background: #ffebee;
  color: #c62828;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 20px;
}

.login-btn {
  width: 100%;
  padding: 14px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.login-btn:hover:not(:disabled) {
  background: #0051d5;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.help-text {
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid #e5e5ea;
}

.help-text p {
  font-size: 13px;
  color: #86868b;
  line-height: 1.6;
}

@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
  }
}
</style>

