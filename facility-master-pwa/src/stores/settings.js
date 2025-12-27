import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // Default API URL - can be overridden by user
  const DEFAULT_API_URL = 'http://192.168.178.134:3000/api/v1'

  const apiUrl = ref(localStorage.getItem('fm_api_url') || DEFAULT_API_URL)

  function setApiUrl(url) {
    // Remove trailing slashes
    const cleanUrl = url.replace(/\/+$/, '')
    apiUrl.value = cleanUrl
    localStorage.setItem('fm_api_url', cleanUrl)
  }

  function resetApiUrl() {
    apiUrl.value = DEFAULT_API_URL
    localStorage.setItem('fm_api_url', DEFAULT_API_URL)
  }

  function getApiUrl() {
    return apiUrl.value
  }

  return {
    apiUrl,
    setApiUrl,
    resetApiUrl,
    getApiUrl
  }
})
