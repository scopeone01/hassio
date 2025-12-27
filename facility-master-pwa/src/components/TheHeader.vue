<template>
  <header class="app-header">
    <div class="header-content">
      <div class="logo-section">
        <div class="logo">🏢</div>
        <span class="app-name">FM Tickets</span>
      </div>
      
      <nav class="header-nav">
        <router-link v-if="authStore.isAuthenticated" to="/projects" class="nav-link">Projekte</router-link>
        <router-link v-if="authStore.isAuthenticated" to="/settings" class="nav-link">Einstellungen</router-link>
        <router-link v-if="authStore.isAdmin" to="/admin/users" class="nav-link">Benutzer</router-link>
        <router-link v-if="authStore.isAdmin" to="/admin/projects" class="nav-link">Projekte verwalten</router-link>
      </nav>
      
      <div class="header-actions">
        <span class="user-name">{{ userName }}</span>
        <button @click="logout" class="logout-btn">
          Abmelden
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const userName = computed(() => {
  return authStore.user?.fullName || authStore.user?.email || 'Benutzer'
})

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-header {
  background: white;
  border-bottom: 1px solid #e5e5ea;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-size: 32px;
  line-height: 1;
}

.app-name {
  font-size: 20px;
  font-weight: 600;
  color: #1d1d1f;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-link {
  font-size: 14px;
  color: #86868b;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: #007aff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-name {
  font-size: 14px;
  color: #86868b;
}

.logout-btn {
  padding: 8px 16px;
  background: #f5f5f7;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  color: #1d1d1f;
  cursor: pointer;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: #e5e5ea;
}

@media (max-width: 768px) {
  .user-name {
    display: none;
  }
}
</style>

