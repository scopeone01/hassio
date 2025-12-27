<template>
  <div class="project-management-view">
    <div class="header">
      <h1>Projektverwaltung</h1>
      <button @click="showCreateModal = true" class="btn-primary">
        <span>+</span> Neues Projekt
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Projekte werden geladen...</p>
    </div>

    <div v-else-if="projects.length === 0" class="empty-state">
      <span class="icon">📁</span>
      <p>Keine Projekte gefunden</p>
      <button @click="showCreateModal = true" class="btn-primary">Erstes Projekt erstellen</button>
    </div>

    <div v-else class="projects-grid">
      <div v-for="project in projects" :key="project.id" class="project-card">
        <div class="project-header">
          <h3>{{ project.name }}</h3>
          <span class="badge" :class="project.isActive ? 'badge-success' : 'badge-danger'">
            {{ project.isActive ? 'Aktiv' : 'Inaktiv' }}
          </span>
        </div>
        <div class="project-info">
          <p><strong>Projektnummer:</strong> {{ project.projectNumber }}</p>
          <p><strong>Adresse:</strong> {{ project.address }}, {{ project.postalCode }} {{ project.city }}</p>
          <p><strong>Offene Tickets:</strong> {{ project.openTickets || 0 }}</p>
        </div>
        <div class="project-actions">
          <button @click="editProject(project)" class="btn-secondary">Bearbeiten</button>
          <button @click="deleteProject(project)" class="btn-danger">Löschen</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Project Modal -->
    <div v-if="showCreateModal || editingProject" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingProject ? 'Projekt bearbeiten' : 'Neues Projekt erstellen' }}</h2>
          <button @click="closeModal" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveProject">
            <div class="form-group">
              <label>Projektname *</label>
              <input v-model="projectForm.name" type="text" required />
            </div>
            <div class="form-group">
              <label>Projektnummer *</label>
              <input v-model="projectForm.projectNumber" type="text" required />
            </div>
            <div class="form-group">
              <label>Straße *</label>
              <input v-model="projectForm.address" type="text" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Postleitzahl *</label>
                <input v-model="projectForm.postalCode" type="text" required />
              </div>
              <div class="form-group">
                <label>Stadt *</label>
                <input v-model="projectForm.city" type="text" required />
              </div>
            </div>
            <div class="form-group">
              <label>Land</label>
              <input v-model="projectForm.country" type="text" />
            </div>
            <div v-if="editingProject" class="form-group">
              <label>
                <input v-model="projectForm.isActive" type="checkbox" />
                Projekt aktiv
              </label>
            </div>
            <div v-if="error" class="error-message">{{ error }}</div>
            <div class="modal-actions">
              <button type="button" @click="closeModal" class="btn-secondary">Abbrechen</button>
              <button type="submit" class="btn-primary" :disabled="saving">
                {{ saving ? 'Speichern...' : 'Speichern' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../services/api'
import { useAppStore } from '../../stores/app'

const appStore = useAppStore()

const projects = ref([])
const loading = ref(false)
const showCreateModal = ref(false)
const editingProject = ref(null)
const saving = ref(false)
const error = ref(null)

const projectForm = ref({
  name: '',
  projectNumber: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'Deutschland',
  isActive: true,
})

onMounted(async () => {
  await loadProjects()
})

async function loadProjects() {
  try {
    loading.value = true
    const response = await api.get('/projects')
    projects.value = response.data
  } catch (error) {
    appStore.setError('Fehler beim Laden der Projekte')
    console.error(error)
  } finally {
    loading.value = false
  }
}

function editProject(project) {
  editingProject.value = project
  projectForm.value = {
    name: project.name,
    projectNumber: project.projectNumber,
    address: project.address,
    city: project.city,
    postalCode: project.postalCode,
    country: project.country || 'Deutschland',
    isActive: project.isActive,
  }
  showCreateModal.value = true
}

function deleteProject(project) {
  if (!confirm(`Möchten Sie das Projekt "${project.name}" wirklich löschen?`)) {
    return
  }

  api.delete(`/projects/${project.id}`)
    .then(() => {
      loadProjects()
      appStore.setSuccess('Projekt gelöscht')
    })
    .catch(error => {
      appStore.setError('Fehler beim Löschen des Projekts')
      console.error(error)
    })
}

async function saveProject() {
  try {
    saving.value = true
    error.value = null

    if (editingProject.value) {
      await api.put(`/projects/${editingProject.value.id}`, projectForm.value)
      appStore.setSuccess('Projekt aktualisiert')
    } else {
      await api.post('/projects', projectForm.value)
      appStore.setSuccess('Projekt erstellt')
    }

    closeModal()
    loadProjects()
  } catch (err) {
    error.value = err.response?.data?.error || 'Fehler beim Speichern'
    console.error(err)
  } finally {
    saving.value = false
  }
}

function closeModal() {
  showCreateModal.value = false
  editingProject.value = null
  projectForm.value = {
    name: '',
    projectNumber: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Deutschland',
    isActive: true,
  }
  error.value = null
}
</script>

<style scoped>
.project-management-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1d1d1f;
}

.btn-primary {
  padding: 12px 24px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary:hover {
  background: #0051d5;
}

.loading,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 20px;
  border: 4px solid #f5f5f7;
  border-top-color: #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.project-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.project-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1d1d1f;
}

.project-info {
  margin-bottom: 20px;
}

.project-info p {
  margin: 8px 0;
  font-size: 14px;
  color: #86868b;
}

.project-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary {
  padding: 8px 16px;
  background: #f5f5f7;
  color: #1d1d1f;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #e5e5ea;
}

.btn-danger {
  padding: 8px 16px;
  background: #ffebee;
  color: #c62828;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:hover {
  background: #ffcdd2;
}

.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-success { background: #e8f5e9; color: #2e7d32; }
.badge-danger { background: #ffebee; color: #c62828; }

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e5ea;
}

.modal-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1d1d1f;
}

.btn-close {
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  color: #86868b;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d1d6;
  border-radius: 8px;
  font-size: 16px;
}

.form-group input[type="checkbox"] {
  width: auto;
  margin-right: 8px;
}

.error-message {
  padding: 12px;
  background: #ffebee;
  color: #c62828;
  border-radius: 8px;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>








