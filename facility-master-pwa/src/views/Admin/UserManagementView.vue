<template>
  <div class="user-management-view">
    <div class="header">
      <h1>Benutzerverwaltung</h1>
      <button @click="showCreateModal = true" class="btn-primary">
        <span>+</span> Neuer Benutzer
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Benutzer werden geladen...</p>
    </div>

    <div v-else-if="users.length === 0" class="empty-state">
      <span class="icon">👥</span>
      <p>Keine Benutzer gefunden</p>
      <button @click="showCreateModal = true" class="btn-primary">Ersten Benutzer erstellen</button>
    </div>

    <div v-else class="users-table">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>E-Mail</th>
            <th>Rolle</th>
            <th>Projekte</th>
            <th>Status</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.firstName }} {{ user.lastName }}</td>
            <td>{{ user.email }}</td>
            <td>
              <span class="badge" :class="getRoleClass(user.roleName)">
                {{ user.roleName }}
              </span>
            </td>
            <td>
              <span class="project-count">{{ user.projects?.length || 0 }} Projekt(e)</span>
            </td>
            <td>
              <span class="badge" :class="user.isActive ? 'badge-success' : 'badge-danger'">
                {{ user.isActive ? 'Aktiv' : 'Inaktiv' }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button @click="editUser(user)" class="btn-icon" title="Bearbeiten">
                  ✏️
                </button>
                <button @click="deleteUser(user)" class="btn-icon btn-danger" title="Löschen">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create/Edit User Modal -->
    <div v-if="showCreateModal || editingUser" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingUser ? 'Benutzer bearbeiten' : 'Neuen Benutzer erstellen' }}</h2>
          <button @click="closeModal" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveUser">
            <div class="form-group">
              <label>Vorname *</label>
              <input v-model="userForm.firstName" type="text" required />
            </div>
            <div class="form-group">
              <label>Nachname *</label>
              <input v-model="userForm.lastName" type="text" required />
            </div>
            <div class="form-group">
              <label>E-Mail *</label>
              <input v-model="userForm.email" type="email" required />
            </div>
            <div class="form-group">
              <label>Passwort {{ editingUser ? '(leer lassen zum Beibehalten)' : '*' }}</label>
              <input v-model="userForm.password" type="password" :required="!editingUser" />
            </div>
            <div class="form-group">
              <label>Telefonnummer</label>
              <input v-model="userForm.phoneNumber" type="tel" />
            </div>
            <div class="form-group">
              <label>Rolle *</label>
              <select v-model="userForm.roleName" required>
                <option value="USER">Benutzer</option>
                <option value="TECHNICIAN">Techniker</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div class="form-group">
              <label>
                <input v-model="userForm.isTechnician" type="checkbox" />
                Ist Techniker
              </label>
            </div>
            <div v-if="editingUser" class="form-group">
              <label>
                <input v-model="userForm.isActive" type="checkbox" />
                Account aktiv
              </label>
            </div>
            <div class="form-group">
              <label>Projekte zuweisen</label>
              <div class="project-checkboxes">
                <label v-for="project in availableProjects" :key="project.id" class="checkbox-label">
                  <input
                    type="checkbox"
                    :value="project.id"
                    v-model="userForm.projectIds"
                  />
                  {{ project.name }}
                </label>
              </div>
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../services/api'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

const users = ref([])
const availableProjects = ref([])
const loading = ref(false)
const showCreateModal = ref(false)
const editingUser = ref(null)
const saving = ref(false)
const error = ref(null)

const userForm = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phoneNumber: '',
  roleName: 'USER',
  isTechnician: false,
  isActive: true,
  projectIds: [],
  accessLevel: 'READ',
  userType: 'Contact',
})

onMounted(async () => {
  await Promise.all([loadUsers(), loadProjects()])
})

async function loadUsers() {
  try {
    loading.value = true
    const response = await api.get('/users')
    users.value = response.data
  } catch (error) {
    appStore.setError('Fehler beim Laden der Benutzer')
    console.error(error)
  } finally {
    loading.value = false
  }
}

async function loadProjects() {
  try {
    const response = await api.get('/projects')
    availableProjects.value = response.data
  } catch (error) {
    console.error('Error loading projects:', error)
  }
}

function editUser(user) {
  editingUser.value = user
  userForm.value = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: '',
    phoneNumber: user.phoneNumber || '',
    roleName: user.roleName,
    isTechnician: user.isTechnician,
    isActive: user.isActive,
    projectIds: user.projects?.map(p => p.id) || [],
    accessLevel: 'READ',
    userType: 'Contact',
  }
  showCreateModal.value = true
}

function deleteUser(user) {
  if (!confirm(`Möchten Sie ${user.firstName} ${user.lastName} wirklich löschen?`)) {
    return
  }

  api.delete(`/users/${user.id}`)
    .then(() => {
      loadUsers()
      appStore.setSuccess('Benutzer gelöscht')
    })
    .catch(error => {
      appStore.setError('Fehler beim Löschen des Benutzers')
      console.error(error)
    })
}

async function saveUser() {
  try {
    saving.value = true
    error.value = null

    const userData = {
      firstName: userForm.value.firstName,
      lastName: userForm.value.lastName,
      email: userForm.value.email,
      phoneNumber: userForm.value.phoneNumber,
      roleName: userForm.value.roleName,
      isTechnician: userForm.value.isTechnician,
      projectIds: userForm.value.projectIds,
      accessLevel: userForm.value.accessLevel,
      userType: userForm.value.userType,
    }

    if (userForm.value.password) {
      userData.password = userForm.value.password
    }

    if (editingUser.value) {
      if (userForm.value.password) {
        userData.password = userForm.value.password
      }
      userData.isActive = userForm.value.isActive
      await api.put(`/users/${editingUser.value.id}`, userData)
      
      // Update project assignments
      const currentProjectIds = editingUser.value.projects?.map(p => p.id) || []
      const toAdd = userForm.value.projectIds.filter(id => !currentProjectIds.includes(id))
      const toRemove = currentProjectIds.filter(id => !userForm.value.projectIds.includes(id))
      
      for (const projectId of toAdd) {
        await api.post(`/users/${editingUser.value.id}/projects/${projectId}`, {
          accessLevel: userForm.value.accessLevel,
          userType: userForm.value.userType,
        })
      }
      
      for (const projectId of toRemove) {
        await api.delete(`/users/${editingUser.value.id}/projects/${projectId}`)
      }
      
      appStore.setSuccess('Benutzer aktualisiert')
    } else {
      await api.post('/users', userData)
      appStore.setSuccess('Benutzer erstellt')
    }

    closeModal()
    loadUsers()
  } catch (err) {
    error.value = err.response?.data?.error || 'Fehler beim Speichern'
    console.error(err)
  } finally {
    saving.value = false
  }
}

function closeModal() {
  showCreateModal.value = false
  editingUser.value = null
  userForm.value = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    roleName: 'USER',
    isTechnician: false,
    isActive: true,
    projectIds: [],
    accessLevel: 'READ',
    userType: 'Contact',
  }
  error.value = null
}

function getRoleClass(role) {
  switch (role) {
    case 'ADMIN': return 'badge-danger'
    case 'TECHNICIAN': return 'badge-warning'
    default: return 'badge-info'
  }
}
</script>

<style scoped>
.user-management-view {
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

.users-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f5f5f7;
}

th, td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid #e5e5ea;
}

th {
  font-weight: 600;
  color: #1d1d1f;
}

.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-danger { background: #ffebee; color: #c62828; }
.badge-warning { background: #fff3e0; color: #e65100; }
.badge-info { background: #e3f2fd; color: #1565c0; }
.badge-success { background: #e8f5e9; color: #2e7d32; }

.actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  padding: 8px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  border-radius: 4px;
}

.btn-icon:hover {
  background: #f5f5f7;
}

.btn-danger:hover {
  background: #ffebee;
}

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

.project-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: #f5f5f7;
  border-radius: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
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

.btn-secondary {
  padding: 12px 24px;
  background: #f5f5f7;
  color: #1d1d1f;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #e5e5ea;
}
</style>








