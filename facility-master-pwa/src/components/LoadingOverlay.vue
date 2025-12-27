<template>
  <div class="loading-overlay">
    <div class="spinner-container">
      <div class="spinner"></div>
      <p>Laden...</p>
    </div>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.spinner-container {
  background: white;
  padding: 32px 48px;
  border-radius: 16px;
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border: 4px solid #f5f5f7;
  border-top-color: #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

p {
  color: #86868b;
  font-size: 14px;
}
</style>








