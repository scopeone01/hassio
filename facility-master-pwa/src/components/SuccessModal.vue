<template>
  <div class="success-modal-overlay" @click="emit('close')">
    <div class="success-modal" @click.stop>
      <div class="success-icon">✓</div>
      <h2>Ticket erfolgreich erstellt!</h2>
      <p class="ticket-number">{{ ticketNumber }}</p>
      <p class="message">
        Das Ticket wurde erstellt und der zugewiesene Techniker wurde benachrichtigt.
      </p>
      <button @click="emit('close')" class="close-btn">
        OK
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  ticketNumber: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])
</script>

<style scoped>
.success-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.success-modal {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 400px;
  text-align: center;
}

.success-icon {
  width: 80px;
  height: 80px;
  background: #34c759;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  margin: 0 auto 24px;
}

h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 12px;
}

.ticket-number {
  font-size: 20px;
  font-weight: 600;
  color: #007aff;
  margin-bottom: 16px;
}

.message {
  color: #86868b;
  line-height: 1.6;
  margin-bottom: 24px;
}

.close-btn {
  width: 100%;
  padding: 14px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.close-btn:hover {
  background: #0051d5;
}
</style>








