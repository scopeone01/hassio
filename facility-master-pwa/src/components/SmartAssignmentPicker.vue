<template>
  <div class="smart-assignment-picker">
    <div class="picker-header">
      <label>Techniker zuweisen (Optional)</label>
      <button
        v-if="selectedUser"
        type="button"
        @click="clearSelection"
        class="clear-btn"
      >
        Zurücksetzen
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Verfügbare Techniker werden geladen...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <span class="icon">⚠️</span>
      <p>{{ error }}</p>
      <button @click="loadAvailableUsers" class="retry-btn">Erneut versuchen</button>
    </div>

    <div v-else-if="availableUsers.length === 0" class="empty-state">
      <span class="icon">👤</span>
      <p>Keine verfügbaren Techniker gefunden</p>
      <p class="hint">Techniker werden automatisch basierend auf Spezialisierung und Auslastung vorgeschlagen.</p>
    </div>

    <div v-else class="users-grid">
      <div
        v-for="user in availableUsers"
        :key="user.id"
        class="user-card"
        :class="{ 
          selected: modelValue === user.id,
          'status-available': user.availabilityStatus === 'available',
          'status-busy': user.availabilityStatus === 'busy',
          'status-limited': user.availabilityStatus === 'limited'
        }"
        @click="selectUser(user)"
      >
        <div class="user-avatar">
          <span>{{ user.initials }}</span>
        </div>
        
        <div class="user-info">
          <div class="user-name">{{ user.name }}</div>
          <div class="user-role">{{ user.role }}</div>
          
          <div v-if="user.specializations && user.specializations.length > 0" class="specializations">
            <span
              v-for="spec in user.specializations.slice(0, 2)"
              :key="spec"
              class="spec-badge"
            >
              {{ spec }}
            </span>
          </div>
          
          <div class="workload">
            <div class="workload-bar">
              <div 
                class="workload-fill" 
                :style="{ width: user.workloadPercent + '%' }"
              ></div>
            </div>
            <span class="workload-text">
              {{ user.currentTickets }}/{{ user.maxTickets }} Tickets
            </span>
          </div>
          
          <div class="availability-badge" :class="'badge-' + user.availabilityStatus">
            <span class="badge-dot"></span>
            {{ getAvailabilityText(user.availabilityStatus) }}
          </div>
        </div>
        
        <div v-if="modelValue === user.id" class="selected-icon">✓</div>
      </div>
    </div>

    <div v-if="selectedUser" class="selection-summary">
      <div class="summary-content">
        <span class="icon">✓</span>
        <div>
          <strong>{{ selectedUser.name }}</strong> wird benachrichtigt
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '../services/api'

const props = defineProps({
  modelValue: {
    type: String,
    default: null
  },
  projectId: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'user-selected'])

const availableUsers = ref([])
const loading = ref(false)
const error = ref(null)

const selectedUser = computed(() => {
  return availableUsers.value.find(u => u.id === props.modelValue)
})

onMounted(() => {
  loadAvailableUsers()
})

watch(() => props.category, () => {
  if (props.category) {
    loadAvailableUsers()
  }
})

async function loadAvailableUsers() {
  try {
    loading.value = true
    error.value = null
    
    const params = {}
    if (props.category) {
      params.category = props.category
    }
    
    const response = await api.get(
      `/projects/${props.projectId}/members/available`,
      { params }
    )
    
    // Handle both response.data (array) and response.data.data (nested)
    const users = Array.isArray(response.data) ? response.data : (response.data?.data || [])
    
    availableUsers.value = users.map(user => ({
      ...user,
      initials: getInitials(user.name),
      workloadPercent: Math.round((user.currentTickets / user.maxTickets) * 100)
    }))
    
  } catch (err) {
    error.value = 'Fehler beim Laden der Techniker'
    console.error(err)
  } finally {
    loading.value = false
  }
}

function selectUser(user) {
  if (props.modelValue === user.id) {
    // Deselect if clicking the same user
    emit('update:modelValue', null)
    emit('user-selected', null)
  } else {
    emit('update:modelValue', user.id)
    emit('user-selected', user)
  }
}

function clearSelection() {
  emit('update:modelValue', null)
  emit('user-selected', null)
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
</script>

<style scoped>
.smart-assignment-picker {
  margin-top: 12px;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.clear-btn {
  padding: 6px 12px;
  background: none;
  border: 1px solid #d1d1d6;
  border-radius: 6px;
  font-size: 12px;
  color: #007aff;
  cursor: pointer;
}

.clear-btn:hover {
  background: #f5f5f7;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  background: #f5f5f7;
  border-radius: 12px;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 3px solid #f5f5f7;
  border-top-color: #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.icon {
  font-size: 32px;
  display: block;
  margin-bottom: 12px;
}

.hint {
  font-size: 14px;
  color: #86868b;
  margin-top: 8px;
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.user-card {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 2px solid #e5e5ea;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-card:hover {
  border-color: #007aff;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.1);
}

.user-card.selected {
  border-color: #007aff;
  background: #f0f8ff;
}

.user-card.status-available {
  border-left: 4px solid #34c759;
}

.user-card.status-busy {
  border-left: 4px solid #ff9500;
}

.user-card.status-limited {
  border-left: 4px solid #ff3b30;
}

.user-avatar {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #007aff, #5856d6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 2px;
}

.user-role {
  font-size: 13px;
  color: #86868b;
  margin-bottom: 8px;
}

.specializations {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.spec-badge {
  padding: 4px 8px;
  background: #e5e5ea;
  border-radius: 4px;
  font-size: 11px;
  color: #1d1d1f;
}

.workload {
  margin-bottom: 8px;
}

.workload-bar {
  height: 6px;
  background: #e5e5ea;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.workload-fill {
  height: 100%;
  background: linear-gradient(90deg, #34c759, #ff9500);
  transition: width 0.3s;
}

.workload-text {
  font-size: 12px;
  color: #86868b;
}

.availability-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.badge-available {
  background: #d1f4dd;
  color: #248a3d;
}

.badge-available .badge-dot {
  background: #34c759;
}

.badge-busy {
  background: #ffe8d1;
  color: #c93a00;
}

.badge-busy .badge-dot {
  background: #ff9500;
}

.badge-limited {
  background: #ffd1d1;
  color: #c41e3a;
}

.badge-limited .badge-dot {
  background: #ff3b30;
}

.selected-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  background: #007aff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

.selection-summary {
  margin-top: 16px;
  padding: 16px;
  background: #d1f4dd;
  border-radius: 12px;
}

.summary-content {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #248a3d;
}

.summary-content .icon {
  font-size: 20px;
  margin: 0;
}

@media (max-width: 768px) {
  .users-grid {
    grid-template-columns: 1fr;
  }
}
</style>

