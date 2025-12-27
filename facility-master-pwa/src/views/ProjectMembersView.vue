<template>
  <div class="project-members-view">
    <div class="header-section">
      <button @click="goBack" class="back-button">
        <span>←</span> Zurück
      </button>
      <h1 class="page-title">Team-Mitglieder</h1>
    </div>

    <div class="filter-tabs">
      <button
        v-for="type in userTypes"
        :key="type.value"
        class="filter-tab"
        :class="{ active: selectedType === type.value }"
        @click="selectedType = type.value"
      >
        {{ type.label }}
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Mitglieder werden geladen...</p>
    </div>

    <div v-else-if="filteredMembers.length === 0" class="empty-state">
      <span class="icon">👥</span>
      <p>Keine Mitglieder gefunden</p>
    </div>

    <div v-else class="members-list">
      <div
        v-for="member in filteredMembers"
        :key="member.id"
        class="member-card"
      >
        <div class="member-avatar">
          <span>{{ member.initials }}</span>
        </div>
        
        <div class="member-info">
          <h3 class="member-name">{{ member.name }}</h3>
          <p class="member-email">{{ member.email }}</p>
          
          <div class="member-badges">
            <span class="badge badge-type">{{ member.userType }}</span>
            <span v-if="member.role" class="badge badge-role">
              {{ member.role.name }}
            </span>
          </div>
          
          <div v-if="member.userType === 'Technician' && member.availability" class="availability">
            <div class="availability-bar">
              <div 
                class="availability-fill" 
                :style="{ width: member.availability.workloadPercent + '%' }"
              ></div>
            </div>
            <span class="availability-text">
              {{ member.availability.currentTickets }}/{{ member.availability.maxTickets }} Tickets
            </span>
            <span 
              class="availability-status"
              :class="'status-' + member.availability.status"
            >
              {{ getAvailabilityText(member.availability.status) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import api from '../services/api'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const projectId = computed(() => route.params.projectId)
const members = ref([])
const loading = ref(false)
const selectedType = ref('all')

const userTypes = [
  { value: 'all', label: 'Alle' },
  { value: 'Technician', label: 'Techniker' },
  { value: 'Contact', label: 'Kontakte' },
  { value: 'Manager', label: 'Manager' }
]

const filteredMembers = computed(() => {
  if (selectedType.value === 'all') {
    return members.value
  }
  return members.value.filter(m => m.userType === selectedType.value)
})

onMounted(async () => {
  await loadMembers()
})

async function loadMembers() {
  try {
    loading.value = true
    const response = await api.get(`/projects/${projectId.value}/members`)
    
    members.value = await Promise.all(
      response.data.map(async (member) => {
        const initials = getInitials(member.user.firstName + ' ' + member.user.lastName)
        let availability = null
        
        if (member.userType === 'Technician') {
          try {
            const availResponse = await api.get(
              `/projects/${projectId.value}/members/${member.userId}/availability`
            )
            availability = {
              ...availResponse.data,
              workloadPercent: Math.round(
                (availResponse.data.activeTickets / availResponse.data.maxTickets) * 100
              )
            }
          } catch (error) {
            console.error('Error loading availability:', error)
          }
        }
        
        return {
          id: member.userId,
          name: member.user.firstName + ' ' + member.user.lastName,
          email: member.user.email,
          userType: member.userType,
          role: member.role,
          initials,
          availability
        }
      })
    )
    
  } catch (error) {
    appStore.setError('Fehler beim Laden der Mitglieder')
    console.error(error)
  } finally {
    loading.value = false
  }
}

function getInitials(name) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvailabilityText(status) {
  const texts = {
    available: 'Verfügbar',
    busy: 'Beschäftigt',
    limited: 'Eingeschränkt'
  }
  return texts[status] || status
}

function goBack() {
  router.back()
}
</script>

<style scoped>
.header-section {
  margin-bottom: 24px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #d1d1d6;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #007aff;
  margin-bottom: 16px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1d1d1f;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
}

.filter-tab {
  padding: 10px 20px;
  background: white;
  border: 1px solid #d1d1d6;
  border-radius: 8px;
  font-size: 14px;
  color: #1d1d1f;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-tab.active {
  background: #007aff;
  color: white;
  border-color: #007aff;
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

.members-list {
  display: grid;
  gap: 16px;
}

.member-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.member-avatar {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #007aff, #5856d6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 4px;
}

.member-email {
  font-size: 14px;
  color: #86868b;
  margin-bottom: 12px;
}

.member-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.badge {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.badge-type {
  background: #e3f2fd;
  color: #1976d2;
}

.badge-role {
  background: #f3e5f5;
  color: #7b1fa2;
}

.availability {
  margin-top: 12px;
}

.availability-bar {
  height: 6px;
  background: #e5e5ea;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.availability-fill {
  height: 100%;
  background: linear-gradient(90deg, #34c759, #ff9500);
  transition: width 0.3s;
}

.availability-text {
  font-size: 13px;
  color: #86868b;
  margin-right: 12px;
}

.availability-status {
  font-size: 13px;
  font-weight: 500;
}

.status-available {
  color: #34c759;
}

.status-busy {
  color: #ff9500;
}

.status-limited {
  color: #ff3b30;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 24px;
  }
}
</style>








