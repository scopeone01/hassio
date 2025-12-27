<template>
  <div class="ticket-list-view">
    <div class="header-section">
      <button @click="goBack" class="back-button">
        <span>←</span> Zurück
      </button>
      <h1 class="page-title">Tickets</h1>
    </div>

    <div class="action-bar">
      <button @click="createTicket" class="create-btn">
        <span>+</span> Neues Ticket
      </button>
      <button @click="router.push(`/projects/${projectId}/members`)" class="members-btn">
        👥 Team
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Tickets werden geladen...</p>
    </div>

    <div v-else-if="tickets.length === 0" class="empty-state">
      <span class="icon">🎫</span>
      <p>Noch keine Tickets vorhanden</p>
      <button @click="createTicket" class="empty-create-btn">
        Erstes Ticket erstellen
      </button>
    </div>

    <div v-else class="tickets-list">
      <div
        v-for="ticket in tickets"
        :key="ticket.id"
        class="ticket-card"
        :class="'priority-' + ticket.priority"
      >
        <div class="ticket-header">
          <span class="ticket-number">{{ ticket.ticketNumber }}</span>
          <span class="ticket-status" :class="'status-' + ticket.status">
            {{ getStatusText(ticket.status) }}
          </span>
        </div>
        
        <h3 class="ticket-title">{{ ticket.title }}</h3>
        
        <div class="ticket-meta">
          <span class="meta-item">
            <span class="icon">📁</span>
            {{ getCategoryText(ticket.category) }}
          </span>
          <span class="meta-item">
            <span class="icon">📅</span>
            {{ formatDate(ticket.createdAt) }}
          </span>
        </div>
        
        <div v-if="ticket.assignedToName" class="assigned-to">
          <span class="icon">👤</span>
          {{ ticket.assignedToName }}
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
const tickets = ref([])
const loading = ref(false)

onMounted(async () => {
  await loadTickets()
})

async function loadTickets() {
  try {
    loading.value = true
    const response = await api.get(`/projects/${projectId.value}/tickets`)
    tickets.value = response.data
  } catch (error) {
    appStore.setError('Fehler beim Laden der Tickets')
    console.error(error)
  } finally {
    loading.value = false
  }
}

function createTicket() {
  router.push(`/projects/${projectId.value}/tickets/new`)
}

function goBack() {
  router.push('/projects')
}

function getStatusText(status) {
  const texts = {
    new: 'Neu',
    open: 'Offen',
    in_progress: 'In Arbeit',
    on_hold: 'Wartend',
    resolved: 'Gelöst',
    closed: 'Geschlossen'
  }
  return texts[status] || status
}

function getCategoryText(category) {
  const texts = {
    electrical: 'Elektrik',
    plumbing: 'Sanitär',
    hvac: 'Heizung/Klima',
    security: 'Sicherheit',
    cleaning: 'Reinigung',
    it: 'IT',
    facility: 'Facility',
    other: 'Sonstiges'
  }
  return texts[category] || category
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
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

.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.create-btn,
.members-btn {
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.create-btn {
  background: #007aff;
  color: white;
}

.create-btn:hover {
  background: #0051d5;
}

.members-btn {
  background: white;
  color: #1d1d1f;
  border: 1px solid #d1d1d6;
}

.members-btn:hover {
  background: #f5f5f7;
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

.empty-create-btn {
  margin-top: 20px;
  padding: 12px 24px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.tickets-list {
  display: grid;
  gap: 16px;
}

.ticket-card {
  padding: 20px;
  background: white;
  border-radius: 12px;
  border-left: 4px solid #d1d1d6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.ticket-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.ticket-card.priority-low {
  border-left-color: #34c759;
}

.ticket-card.priority-normal {
  border-left-color: #007aff;
}

.ticket-card.priority-high {
  border-left-color: #ff9500;
}

.ticket-card.priority-critical {
  border-left-color: #ff3b30;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ticket-number {
  font-size: 13px;
  font-weight: 600;
  color: #007aff;
}

.ticket-status {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.status-new,
.status-open {
  background: #e3f2fd;
  color: #1976d2;
}

.status-in_progress {
  background: #fff3e0;
  color: #f57c00;
}

.status-resolved {
  background: #e8f5e9;
  color: #388e3c;
}

.status-closed {
  background: #f5f5f5;
  color: #757575;
}

.ticket-title {
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 12px;
}

.ticket-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #86868b;
}

.meta-item .icon {
  font-size: 14px;
  margin: 0;
}

.assigned-to {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f5f5f7;
  border-radius: 6px;
  font-size: 13px;
  color: #1d1d1f;
}

.assigned-to .icon {
  font-size: 14px;
  margin: 0;
}
</style>








