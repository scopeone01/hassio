import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const isLoading = ref(false)
  const error = ref(null)
  const success = ref(null)
  const currentProject = ref(JSON.parse(localStorage.getItem('fm_current_project') || 'null'))
  
  function setLoading(value) {
    isLoading.value = value
  }
  
  function setError(message) {
    error.value = message
    setTimeout(() => {
      error.value = null
    }, 5000)
  }
  
  function setSuccess(message) {
    success.value = message
    setTimeout(() => {
      success.value = null
    }, 3000)
  }
  
  function clearMessages() {
    error.value = null
    success.value = null
  }
  
  function setCurrentProject(project) {
    currentProject.value = project
    localStorage.setItem('fm_current_project', JSON.stringify(project))
  }
  
  return {
    isLoading,
    error,
    success,
    currentProject,
    setLoading,
    setError,
    setSuccess,
    clearMessages,
    setCurrentProject
  }
})

