<template>
  <div id="app" class="app-container">
    <TheHeader v-if="isAuthenticated" />
    <main class="main-content">
      <router-view />
    </main>
    <LoadingOverlay v-if="isLoading" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from './stores/auth'
import { useAppStore } from './stores/app'
import TheHeader from './components/TheHeader.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'

const authStore = useAuthStore()
const appStore = useAppStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isLoading = computed(() => appStore.isLoading)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f5f5f7;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 20px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }
}
</style>








