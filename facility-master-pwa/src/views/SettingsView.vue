<template>
  <div class="settings-view">
    <div class="settings-header">
      <h1>Einstellungen</h1>
      <p class="subtitle">Konfigurieren Sie die Verbindung zum API-Server</p>
    </div>

    <div class="settings-card">
      <div class="setting-section">
        <h2>API-Server Verbindung</h2>
        <p class="section-description">
          Geben Sie die URL Ihres FacilityMaster API-Servers ein.
        </p>

        <form @submit.prevent="handleSave" class="settings-form">
          <div class="form-group">
            <label for="api-url">API-Server URL</label>
            <input
              id="api-url"
              v-model="form.apiUrl"
              type="url"
              placeholder="http://192.168.178.134:3000/api/v1"
              required
            />
            <span class="help-text">
              Format: http://IP-ADRESSE:PORT/api/v1
            </span>
          </div>

          <div class="current-setting">
            <span class="label">Aktuelle URL:</span>
            <code>{{ currentApiUrl }}</code>
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <div v-if="success" class="success-message">
            {{ success }}
          </div>

          <div class="button-group">
            <button type="submit" class="save-btn" :disabled="isSaving">
              <span v-if="isSaving">Speichern...</span>
              <span v-else">Speichern</span>
            </button>
            <button type="button" @click="handleReset" class="reset-btn">
              Standard wiederherstellen
            </button>
            <button type="button" @click="handleTest" class="test-btn" :disabled="isTesting">
              <span v-if="isTesting">Teste...</span>
              <span v-else>Verbindung testen</span>
            </button>
          </div>
        </form>
      </div>

      <div class="setting-section">
        <h2>Informationen</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Version:</span>
            <span class="info-value">1.0.0</span>
          </div>
          <div class="info-item">
            <span class="info-label">Benutzer:</span>
            <span class="info-value">{{ userName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Rolle:</span>
            <span class="info-value">{{ userRole }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const settingsStore = useSettingsStore()
const authStore = useAuthStore()

const form = ref({
  apiUrl: ''
})

const isSaving = ref(false)
const isTesting = ref(false)
const error = ref(null)
const success = ref(null)

const currentApiUrl = computed(() => settingsStore.apiUrl)
const userName = computed(() => authStore.user?.fullName || authStore.user?.email || 'Unbekannt')
const userRole = computed(() => authStore.user?.roleName || 'Benutzer')

onMounted(() => {
  form.value.apiUrl = settingsStore.apiUrl
})

async function handleSave() {
  if (isSaving.value) return

  try {
    isSaving.value = true
    error.value = null
    success.value = null

    // Validate URL format
    const urlPattern = /^https?:\/\/.+/
    if (!urlPattern.test(form.value.apiUrl)) {
      error.value = 'Bitte geben Sie eine gültige URL ein (z.B. http://192.168.1.100:3000/api/v1)'
      return
    }

    settingsStore.setApiUrl(form.value.apiUrl)
    success.value = 'Einstellungen erfolgreich gespeichert!'

    // Auto-clear success message
    setTimeout(() => {
      success.value = null
    }, 3000)
  } catch (err) {
    error.value = 'Fehler beim Speichern der Einstellungen'
    console.error(err)
  } finally {
    isSaving.value = false
  }
}

function handleReset() {
  settingsStore.resetApiUrl()
  form.value.apiUrl = settingsStore.apiUrl
  success.value = 'Standard-URL wiederhergestellt'
  setTimeout(() => {
    success.value = null
  }, 3000)
}

async function handleTest() {
  if (isTesting.value) return

  try {
    isTesting.value = true
    error.value = null
    success.value = null

    // Temporarily save to test
    const originalUrl = settingsStore.apiUrl
    settingsStore.setApiUrl(form.value.apiUrl)

    // Try to reach the health endpoint or any public endpoint
    await api.get('/').catch(() => {
      // If root endpoint doesn't exist, try a generic endpoint
      return api.get('/', { validateStatus: () => true })
    })

    success.value = 'Verbindung erfolgreich! Server ist erreichbar.'

    // Auto-clear success message
    setTimeout(() => {
      success.value = null
    }, 3000)
  } catch (err) {
    error.value = `Verbindung fehlgeschlagen: ${err.message}. Bitte überprüfen Sie die URL und ob der Server läuft.`
    console.error(err)
  } finally {
    isTesting.value = false
  }
}
</script>

<style scoped>
.settings-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.settings-header {
  margin-bottom: 32px;
}

.settings-header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 16px;
  color: #86868b;
}

.settings-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.setting-section {
  margin-bottom: 40px;
}

.setting-section:last-child {
  margin-bottom: 0;
}

.setting-section h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.section-description {
  font-size: 14px;
  color: #86868b;
  margin-bottom: 24px;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

label {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  margin-bottom: 8px;
}

input {
  padding: 12px 16px;
  border: 1px solid #d1d1d6;
  border-radius: 8px;
  font-size: 16px;
  font-family: 'Monaco', 'Menlo', monospace;
  transition: all 0.2s;
}

input:focus {
  outline: none;
  border-color: #007aff;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.help-text {
  font-size: 12px;
  color: #86868b;
  margin-top: 6px;
}

.current-setting {
  padding: 12px 16px;
  background: #f5f5f7;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-setting .label {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
}

.current-setting code {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  color: #007aff;
}

.error-message {
  padding: 12px 16px;
  background: #ffebee;
  color: #c62828;
  border-radius: 8px;
  font-size: 14px;
}

.success-message {
  padding: 12px 16px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 8px;
  font-size: 14px;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

button {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.save-btn {
  background: #007aff;
  color: white;
  flex: 1;
}

.save-btn:hover:not(:disabled) {
  background: #0051d5;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reset-btn {
  background: #f5f5f7;
  color: #1d1d1f;
}

.reset-btn:hover {
  background: #e5e5ea;
}

.test-btn {
  background: #34c759;
  color: white;
}

.test-btn:hover:not(:disabled) {
  background: #28a745;
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-item {
  padding: 16px;
  background: #f5f5f7;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #86868b;
  font-weight: 500;
}

.info-value {
  font-size: 16px;
  color: #1d1d1f;
  font-weight: 600;
}

@media (max-width: 768px) {
  .button-group {
    flex-direction: column;
  }

  .save-btn {
    order: 1;
  }

  .test-btn {
    order: 2;
  }

  .reset-btn {
    order: 3;
  }
}
</style>
