import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('fm_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('fm_user') || 'null'))
  const availableProjects = ref(JSON.parse(localStorage.getItem('fm_available_projects') || '[]'))
  const autoSelectedProject = ref(JSON.parse(localStorage.getItem('fm_auto_selected_project') || 'null'))
  
  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.roleName === 'ADMIN')
  const requiresProjectSelection = computed(() => availableProjects.value.length > 1)
  
  async function login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password })
      token.value = response.data.token
      user.value = response.data.user
      availableProjects.value = response.data.availableProjects || []
      autoSelectedProject.value = response.data.autoSelectedProject || null
      
      localStorage.setItem('fm_token', token.value)
      localStorage.setItem('fm_user', JSON.stringify(user.value))
      localStorage.setItem('fm_available_projects', JSON.stringify(availableProjects.value))
      if (autoSelectedProject.value) {
        localStorage.setItem('fm_auto_selected_project', JSON.stringify(autoSelectedProject.value))
      }
      
      return { 
        success: true,
        autoSelectedProject: autoSelectedProject.value,
        requiresProjectSelection: response.data.requiresProjectSelection || false
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Login fehlgeschlagen'
      }
    }
  }
  
  async function switchProject(projectId) {
    try {
      const response = await api.post(`/auth/switch-project/${projectId}`)
      const project = response.data.project
      
      // Update auto selected project
      autoSelectedProject.value = project
      localStorage.setItem('fm_auto_selected_project', JSON.stringify(project))
      
      return { success: true, project }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Projektwechsel fehlgeschlagen'
      }
    }
  }
  
  function logout() {
    token.value = null
    user.value = null
    availableProjects.value = []
    autoSelectedProject.value = null
    localStorage.removeItem('fm_token')
    localStorage.removeItem('fm_user')
    localStorage.removeItem('fm_available_projects')
    localStorage.removeItem('fm_auto_selected_project')
  }
  
  return {
    token,
    user,
    availableProjects,
    autoSelectedProject,
    isAuthenticated,
    isAdmin,
    requiresProjectSelection,
    login,
    switchProject,
    logout
  }
})

