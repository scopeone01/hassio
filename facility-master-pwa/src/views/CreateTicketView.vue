<template>
  <div class="create-ticket-view">
    <div class="header-section">
      <button @click="goBack" class="back-button">
        <span class="icon">←</span>
        Zurück
      </button>
      <h1 class="page-title">Neues Ticket erstellen</h1>
      <p class="project-name">{{ projectName }}</p>
    </div>

    <form @submit.prevent="submitTicket" class="ticket-form">
      <!-- Titel & Beschreibung -->
      <div class="form-section">
        <h2 class="section-title">Ticket-Details</h2>
        
        <div class="form-group">
          <label for="title" class="required">Titel</label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            placeholder="Kurze Beschreibung des Problems"
            required
            maxlength="200"
          />
          <span class="char-count">{{ form.title.length }}/200</span>
        </div>

        <div class="form-group">
          <label for="description" class="required">Beschreibung</label>
          <textarea
            id="description"
            v-model="form.description"
            placeholder="Detaillierte Beschreibung des Problems..."
            rows="6"
            required
          />
        </div>
      </div>

      <!-- Kategorie & Priorität -->
      <div class="form-section">
        <h2 class="section-title">Klassifizierung</h2>
        
        <div class="form-row">
          <div class="form-group">
            <label for="category" class="required">Kategorie</label>
            <select id="category" v-model="form.category" required>
              <option value="">Auswählen...</option>
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.icon }} {{ cat.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="priority" class="required">Priorität</label>
            <select id="priority" v-model="form.priority" required>
              <option value="">Auswählen...</option>
              <option value="low">🟢 Niedrig</option>
              <option value="normal">🟡 Normal</option>
              <option value="high">🟠 Hoch</option>
              <option value="critical">🔴 Kritisch</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Smart Assignment -->
      <div class="form-section">
        <h2 class="section-title">Zuweisung</h2>
        
        <SmartAssignmentPicker
          v-model="form.assignedToId"
          :project-id="projectId"
          :category="form.category"
          @user-selected="onUserSelected"
        />
      </div>

      <!-- Standort -->
      <div class="form-section">
        <h2 class="section-title">Standort (Optional)</h2>
        
        <div class="form-group">
          <label for="building">Gebäude</label>
          <select id="building" v-model="form.buildingId" @change="onBuildingChange">
            <option value="">Kein Gebäude</option>
            <option v-for="building in buildings" :key="building.id" :value="building.id">
              {{ building.name }}
            </option>
          </select>
        </div>

        <div v-if="form.buildingId" class="form-row">
          <div class="form-group">
            <label for="floor">Etage</label>
            <input
              id="floor"
              v-model="form.floor"
              type="text"
              placeholder="z.B. EG, 1. OG"
            />
          </div>

          <div class="form-group">
            <label for="room">Raum</label>
            <input
              id="room"
              v-model="form.room"
              type="text"
              placeholder="z.B. Büro 101"
            />
          </div>
        </div>
      </div>

      <!-- Dateien -->
      <div class="form-section">
        <h2 class="section-title">Anhänge (Optional)</h2>
        
        <div class="file-upload-area">
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*,application/pdf"
            @change="onFileSelect"
            hidden
          />
          <label for="file-input" class="upload-button">
            <span class="icon">📎</span>
            Dateien hinzufügen
          </label>
          
          <div v-if="form.files.length > 0" class="file-list">
            <div v-for="(file, index) in form.files" :key="index" class="file-item">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <button type="button" @click="removeFile(index)" class="remove-btn">×</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Kontakt-Informationen -->
      <div class="form-section">
        <h2 class="section-title">Ihre Kontaktdaten</h2>
        
        <div class="form-row">
          <div class="form-group">
            <label for="contactName" class="required">Name</label>
            <input
              id="contactName"
              v-model="form.contactName"
              type="text"
              placeholder="Max Mustermann"
              required
            />
          </div>

          <div class="form-group">
            <label for="contactEmail" class="required">E-Mail</label>
            <input
              id="contactEmail"
              v-model="form.contactEmail"
              type="email"
              placeholder="max@example.com"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label for="contactPhone">Telefon (Optional)</label>
          <input
            id="contactPhone"
            v-model="form.contactPhone"
            type="tel"
            placeholder="+49 123 456789"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button type="button" @click="goBack" class="btn btn-secondary">
          Abbrechen
        </button>
        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          <span v-if="isSubmitting">Wird erstellt...</span>
          <span v-else>Ticket erstellen</span>
        </button>
      </div>
    </form>

    <!-- Success Modal -->
    <SuccessModal
      v-if="showSuccessModal"
      :ticket-number="createdTicketNumber"
      @close="onSuccessClose"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import api from '../services/api'
import SmartAssignmentPicker from '../components/SmartAssignmentPicker.vue'
import SuccessModal from '../components/SuccessModal.vue'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const projectId = computed(() => route.params.projectId)
const projectName = ref('')
const buildings = ref([])
const isSubmitting = ref(false)
const showSuccessModal = ref(false)
const createdTicketNumber = ref('')

const form = ref({
  title: '',
  description: '',
  category: '',
  priority: 'normal',
  assignedToId: null,
  buildingId: '',
  floor: '',
  room: '',
  files: [],
  contactName: '',
  contactEmail: '',
  contactPhone: ''
})

const categories = [
  { value: 'electrical', label: 'Elektrik', icon: '⚡' },
  { value: 'plumbing', label: 'Sanitär', icon: '🚰' },
  { value: 'hvac', label: 'Heizung/Klima', icon: '🌡️' },
  { value: 'security', label: 'Sicherheit', icon: '🔒' },
  { value: 'cleaning', label: 'Reinigung', icon: '🧹' },
  { value: 'it', label: 'IT', icon: '💻' },
  { value: 'facility', label: 'Facility', icon: '🏢' },
  { value: 'other', label: 'Sonstiges', icon: '📝' }
]

onMounted(async () => {
  await loadProjectData()
})

async function loadProjectData() {
  try {
    appStore.setLoading(true)
    
    const [projectResponse, buildingsResponse] = await Promise.all([
      api.get(`/projects/${projectId.value}`),
      api.get(`/projects/${projectId.value}/buildings`)
    ])
    
    projectName.value = projectResponse.data.name
    buildings.value = buildingsResponse.data
    
  } catch (error) {
    appStore.setError('Fehler beim Laden der Projektdaten')
    console.error(error)
  } finally {
    appStore.setLoading(false)
  }
}

function onBuildingChange() {
  form.value.floor = ''
  form.value.room = ''
}

function onUserSelected(user) {
  console.log('User ausgewählt:', user)
}

function onFileSelect(event) {
  const files = Array.from(event.target.files)
  form.value.files.push(...files)
}

function removeFile(index) {
  form.value.files.splice(index, 1)
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function submitTicket() {
  if (isSubmitting.value) return
  
  try {
    isSubmitting.value = true
    appStore.setLoading(true)
    
    // Build request payload
    const payload = {
      title: form.value.title,
      description: form.value.description,
      category: form.value.category,
      priority: form.value.priority,
      contactName: form.value.contactName,
      contactEmail: form.value.contactEmail,
      contactPhone: form.value.contactPhone || null,
    }
    
    if (form.value.assignedToId) {
      payload.assignedToId = form.value.assignedToId
    }
    
    if (form.value.buildingId) {
      payload.buildingId = form.value.buildingId
      payload.floor = form.value.floor || null
      payload.room = form.value.room || null
    }
    
    // If there are files, use FormData, otherwise use JSON
    let requestData
    let config = {}
    
    if (form.value.files && form.value.files.length > 0) {
      // Use FormData if files are present
      const formData = new FormData()
      Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined) {
          formData.append(key, payload[key])
        }
      })
      form.value.files.forEach(file => {
        formData.append('attachments', file)
      })
      requestData = formData
      // Don't set Content-Type header - let axios set it automatically for FormData
    } else {
      // Use JSON if no files
      requestData = payload
    }
    
    const response = await api.post(
      `/projects/${projectId.value}/tickets`,
      requestData,
      config
    )
    
    createdTicketNumber.value = response.data.ticketNumber
    showSuccessModal.value = true
    
  } catch (error) {
    appStore.setError(error.response?.data?.error || 'Fehler beim Erstellen des Tickets')
    console.error('Ticket creation error:', error)
    console.error('Error details:', error.response?.data)
  } finally {
    isSubmitting.value = false
    appStore.setLoading(false)
  }
}

function onSuccessClose() {
  showSuccessModal.value = false
  router.push(`/projects/${projectId.value}/tickets`)
}

function goBack() {
  router.back()
}
</script>

<style scoped>
.create-ticket-view {
  max-width: 800px;
  margin: 0 auto;
}

.header-section {
  margin-bottom: 32px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: none;
  border: 1px solid #d1d1d6;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #007aff;
  margin-bottom: 16px;
}

.back-button:hover {
  background: #f5f5f7;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.project-name {
  font-size: 16px;
  color: #86868b;
}

.ticket-form {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid #f5f5f7;
}

.form-section:last-of-type {
  border-bottom: none;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  margin-bottom: 8px;
}

label.required::after {
  content: ' *';
  color: #ff3b30;
}

input[type="text"],
input[type="email"],
input[type="tel"],
select,
textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d1d6;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #007aff;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

textarea {
  resize: vertical;
  font-family: inherit;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #86868b;
  margin-top: 4px;
}

.file-upload-area {
  border: 2px dashed #d1d1d6;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}

.upload-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #007aff;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.upload-button:hover {
  background: #0051d5;
}

.file-list {
  margin-top: 20px;
  text-align: left;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f5f7;
  border-radius: 8px;
  margin-bottom: 8px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #1d1d1f;
}

.file-size {
  font-size: 12px;
  color: #86868b;
}

.remove-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: #ff3b30;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.form-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 32px;
}

.btn {
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #007aff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0051d5;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f7;
  color: #1d1d1f;
}

.btn-secondary:hover {
  background: #e5e5ea;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .ticket-form {
    padding: 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
}
</style>

