<template>
  <div class="projects-view">
    <h1 class="page-title">Projekte</h1>
    <p class="page-subtitle">Wählen Sie ein Projekt aus, um ein Ticket zu erstellen</p>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Projekte werden geladen...</p>
    </div>

    <div v-else-if="projects.length === 0" class="empty-state">
      <span class="icon">📁</span>
      <p>Keine Projekte verfügbar</p>
    </div>

    <div v-else class="projects-grid">
      <div
        v-for="project in projects"
        :key="project.id"
        class="project-card"
        @click="goToTickets(project)"
      >
        <div class="project-icon">🏢</div>
        <div class="project-info">
          <h3>{{ project.name }}</h3>
          <p class="project-meta">{{ project.address }}, {{ project.city }}</p>
          <div class="project-stats">
            <span class="stat">
              <span class="stat-icon">🎫</span>
              {{ project.openTickets || 0 }} offene Tickets
            </span>
          </div>
        </div>
        <span class="arrow">→</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()

const projects = ref([])
const loading = ref(false)

onMounted(async () => {
  await loadProjects()
})

async function loadProjects() {
  try {
    loading.value = true
    // Always fetch from API to get latest projects (especially important for admins)
    const response = await api.get('/projects')
    projects.value = response.data
    // Update auth store with latest projects
    authStore.availableProjects = response.data
    localStorage.setItem('fm_available_projects', JSON.stringify(response.data))
  } catch (error) {
    appStore.setError('Fehler beim Laden der Projekte')
    console.error(error)
    // Fallback to cached projects if API fails
    if (authStore.availableProjects && authStore.availableProjects.length > 0) {
      projects.value = authStore.availableProjects
    }
  } finally {
    loading.value = false
  }
}

async function goToTickets(project) {
  // Store selected project
  appStore.setCurrentProject(project)
  
  // If user has multiple projects, switch to selected project
  if (authStore.requiresProjectSelection) {
    const result = await authStore.switchProject(project.id)
    if (!result.success) {
      console.error('Failed to switch project:', result.message)
    }
  }
  
  router.push(`/project/${project.id}/create-ticket`)
}
</script>

<style scoped>
.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 16px;
  color: #86868b;
  margin-bottom: 32px;
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

.icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.projects-grid {
  display: grid;
  gap: 16px;
}

.project-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border: 2px solid #e5e5ea;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.project-card:hover {
  border-color: #007aff;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.1);
}

.project-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.project-info {
  flex: 1;
  min-width: 0;
}

.project-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 4px;
}

.project-meta {
  font-size: 14px;
  color: #86868b;
  margin-bottom: 8px;
}

.project-stats {
  display: flex;
  gap: 16px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #86868b;
}

.stat-icon {
  font-size: 14px;
}

.arrow {
  font-size: 24px;
  color: #d1d1d6;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 24px;
  }
  
  .project-card {
    padding: 16px;
  }
}
</style>

