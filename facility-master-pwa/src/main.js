import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/css/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// Register Service Worker (only in production)
// In development, the service worker is disabled via vite.config.js
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration)
      })
      .catch(registrationError => {
        // Silently fail in development - this is expected
        if (import.meta.env.DEV) {
          console.debug('SW registration skipped in development')
        } else {
          console.log('SW registration failed: ', registrationError)
        }
      })
  })
}





