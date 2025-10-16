<template>
  <div class="pwa-install-container">
    <!-- Install prompt for desktop -->
    <div
      v-if="showInstallPrompt && !isInstalled && !isMobile"
      class="install-banner desktop"
    >
      <div class="install-content">
        <div class="install-icon">📱</div>
        <div class="install-text">
          <h4>安装应用</h4>
          <p>将 Taro Bluetooth Print 文档安装到您的设备，获得更好的使用体验</p>
        </div>
        <div class="install-actions">
          <button @click="dismissInstallPrompt" class="dismiss-btn">
            稍后
          </button>
          <button @click="installPWA" class="install-btn" :disabled="isInstalling">
            {{ isInstalling ? '安装中...' : '立即安装' }}
          </button>
        </div>
      </div>
      <button @click="dismissInstallPrompt" class="close-btn">×</button>
    </div>

    <!-- Install prompt for mobile -->
    <div
      v-if="showInstallPrompt && !isInstalled && isMobile"
      class="install-banner mobile"
    >
      <div class="mobile-install-content">
        <div class="mobile-install-header">
          <span class="mobile-install-icon">📱</span>
          <span class="mobile-install-title">添加到主屏幕</span>
          <button @click="dismissInstallPrompt" class="mobile-close-btn">×</button>
        </div>
        <div class="mobile-install-steps">
          <p>点击分享按钮</p>
          <p>选择"添加到主屏幕"</p>
          <p>享受应用般的体验</p>
        </div>
        <button @click="dismissInstallPrompt" class="mobile-dismiss-btn">
          知道了
        </button>
      </div>
    </div>

    <!-- Update available notification -->
    <div v-if="updateAvailable && !isUpdating" class="update-banner">
      <div class="update-content">
        <div class="update-icon">🔄</div>
        <div class="update-text">
          <h4>发现新版本</h4>
          <p>有新的内容更新可用，立即刷新获取最新文档</p>
        </div>
        <div class="update-actions">
          <button @click="dismissUpdate" class="dismiss-btn">
            稍后
          </button>
          <button @click="applyUpdate" class="update-btn" :disabled="isUpdating">
            {{ isUpdating ? '更新中...' : '立即更新' }}
          </button>
        </div>
      </div>
      <button @click="dismissUpdate" class="close-btn">×</button>
    </div>

    <!-- Offline indicator -->
    <div v-if="isOffline" class="offline-indicator">
      <div class="offline-content">
        <div class="offline-icon">📵</div>
        <span class="offline-text">离线模式</span>
        <button @click="checkConnection" class="retry-btn" :disabled="isRetrying">
          {{ isRetrying ? '重试中...' : '重试' }}
        </button>
      </div>
    </div>

    <!-- Connection status indicator -->
    <div v-if="showConnectionStatus" class="connection-status" :class="connectionClass">
      <div class="status-content">
        <div class="status-icon">{{ connectionIcon }}</div>
        <span class="status-text">{{ connectionText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// State management
const showInstallPrompt = ref(false)
const isInstalled = ref(false)
const isInstalling = ref(false)
const isMobile = ref(false)
const updateAvailable = ref(false)
const isUpdating = ref(false)
const isOffline = ref(false)
const isRetrying = ref(false)
const showConnectionStatus = ref(false)

// PWA install prompt
let deferredPrompt: any = null

// Computed properties
const connectionClass = computed(() => {
  if (isOffline.value) return 'offline'
  if (showConnectionStatus.value) return 'connected'
  return ''
})

const connectionIcon = computed(() => {
  if (isOffline.value) return '📵'
  return '🌐'
})

const connectionText = computed(() => {
  if (isOffline.value) return '离线模式'
  return '网络连接正常'
})

// Methods
const checkIsMobile = () => {
  isMobile.value = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

const checkIsInstalled = async () => {
  // Check if running as standalone PWA
  isInstalled.value = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone === true ||
                     document.referrer.includes('android-app://')
}

const handleInstallPrompt = (e: Event) => {
  e.preventDefault()
  deferredPrompt = e
  showInstallPrompt.value = true
}

const installPWA = async () => {
  if (!deferredPrompt) return

  isInstalling.value = true

  try {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      showInstallPrompt.value = false
      await checkIsInstalled()
    }

    deferredPrompt = null
  } catch (error) {
    console.error('PWA installation failed:', error)
  } finally {
    isInstalling.value = false
  }
}

const dismissInstallPrompt = () => {
  showInstallPrompt.value = false
  // Store dismissal in localStorage
  localStorage.setItem('pwa-install-dismissed', Date.now().toString())
}

const handleBeforeInstallPrompt = (e: Event) => {
  // Check if user has previously dismissed the install prompt
  const dismissed = localStorage.getItem('pwa-install-dismissed')
  if (dismissed) {
    const dismissTime = parseInt(dismissed)
    const daysSinceDismiss = (Date.now() - dismissTime) / (1000 * 60 * 60 * 24)

    // Show prompt again after 7 days
    if (daysSinceDismiss < 7) {
      return
    }
  }

  handleInstallPrompt(e)
}

const checkConnection = async () => {
  isRetrying.value = true

  try {
    // Try to fetch a small resource to check connectivity
    const response = await fetch('/manifest.json', {
      method: 'HEAD',
      cache: 'no-cache'
    })

    if (response.ok) {
      isOffline.value = false
      showTemporaryStatus('网络连接已恢复')
    }
  } catch (error) {
    // Still offline
    showTemporaryStatus('仍处于离线状态')
  } finally {
    isRetrying.value = false
  }
}

const showTemporaryStatus = (message: string) => {
  // Implementation would show temporary status message
  console.log('Connection status:', message)
}

const handleOnline = () => {
  isOffline.value = false
  showTemporaryStatus('网络连接已恢复')
}

const handleOffline = () => {
  isOffline.value = true
  showTemporaryStatus('进入离线模式')
}

const handleSWUpdate = (event: any) => {
  updateAvailable.value = true
  console.log('Service Worker update available:', event.detail)
}

const applyUpdate = async () => {
  isUpdating.value = true

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready

      if (registration.waiting) {
        // Tell the waiting service worker to skip waiting
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })

        // Listen for the controlling change
        registration.addEventListener('controllerchange', () => {
          window.location.reload()
        })
      }
    }
  } catch (error) {
    console.error('Failed to apply update:', error)
    showTemporaryStatus('更新失败，请手动刷新页面')
  } finally {
    isUpdating.value = false
  }
}

const dismissUpdate = () => {
  updateAvailable.value = false
  localStorage.setItem('pwa-update-dismissed', Date.now().toString())
}

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('Service Worker registered:', registration)

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              handleSWUpdate({ detail: { newWorker } })
            }
          })
        }
      })

      // Listen for controlling changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Page has been controlled by a new service worker
        console.log('Service Worker controller changed')
      })

    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }
}

const checkNetworkStatus = () => {
  isOffline.value = !navigator.onLine
}

const setupPeriodicStatusCheck = () => {
  setInterval(checkNetworkStatus, 30000) // Check every 30 seconds
}

// Lifecycle hooks
onMounted(async () => {
  checkIsMobile()
  await checkIsInstalled()
  checkNetworkStatus()

  // Set up event listeners
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Register service worker
  await registerServiceWorker()

  // Set up periodic checks
  setupPeriodicStatusCheck()

  // Check for previously dismissed update prompt
  const updateDismissed = localStorage.getItem('pwa-update-dismissed')
  if (updateDismissed) {
    const dismissTime = parseInt(updateDismissed)
    const hoursSinceDismiss = (Date.now() - dismissTime) / (1000 * 60 * 60)

    // Show update prompt again after 24 hours
    if (hoursSinceDismiss >= 24) {
      localStorage.removeItem('pwa-update-dismissed')
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>

<style scoped>
.pwa-install-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  pointer-events: none;
}

.pwa-install-container > * {
  pointer-events: auto;
}

/* Desktop install banner */
.install-banner.desktop {
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 400px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  padding: 16px;
  z-index: 1001;
}

.install-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.install-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.install-text {
  flex: 1;
}

.install-text h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.install-text p {
  margin: 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

.install-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dismiss-btn,
.install-btn,
.update-btn,
.mobile-dismiss-btn,
.retry-btn {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dismiss-btn {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
}

.install-btn,
.update-btn,
.retry-btn {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.install-btn:hover,
.update-btn:hover,
.retry-btn:hover {
  background: var(--vp-c-brand-2);
}

.install-btn:disabled,
.update-btn:disabled,
.retry-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.close-btn,
.mobile-close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--vp-c-text-2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover,
.mobile-close-btn:hover {
  background: var(--vp-c-bg-soft);
}

/* Mobile install banner */
.install-banner.mobile {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-border);
  padding: 16px;
  z-index: 1001;
}

.mobile-install-content {
  max-width: 400px;
  margin: 0 auto;
}

.mobile-install-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.mobile-install-icon {
  font-size: 20px;
  margin-right: 8px;
}

.mobile-install-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  flex: 1;
}

.mobile-install-steps {
  margin-bottom: 12px;
}

.mobile-install-steps p {
  margin: 4px 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.mobile-dismiss-btn {
  width: 100%;
  padding: 8px;
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

/* Update banner */
.update-banner {
  position: fixed;
  bottom: 20px;
  right: 20px;
  max-width: 350px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.1);
  padding: 16px;
  z-index: 1001;
}

.update-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.update-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.update-text {
  flex: 1;
}

.update-text h4 {
  margin: 0 0 4px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.update-text p {
  margin: 0;
  font-size: 11px;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

/* Offline indicator */
.offline-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #f59e0b;
  color: white;
  padding: 8px;
  z-index: 1002;
}

.offline-content {
  max-width: 400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.offline-icon {
  font-size: 16px;
}

.offline-text {
  font-size: 12px;
  font-weight: 500;
}

.retry-btn {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 10px;
}

.retry-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Connection status */
.connection-status {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 20px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.connection-status.show {
  opacity: 1;
}

.connection-status.connected {
  border-color: #10b981;
  color: #10b981;
}

.connection-status.offline {
  border-color: #f59e0b;
  color: #f59e0b;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-icon {
  font-size: 12px;
}

.status-text {
  font-size: 10px;
  font-weight: 500;
}

/* Responsive design */
@media (max-width: 768px) {
  .install-banner.desktop {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }

  .install-content {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }

  .install-actions {
    flex-direction: row;
    width: 100%;
  }

  .install-actions button {
    flex: 1;
  }

  .update-banner {
    bottom: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }

  .update-content {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }

  .update-actions {
    flex-direction: row;
    width: 100%;
  }

  .connection-status {
    bottom: 10px;
    left: 10px;
  }
}

/* Dark mode */
html.dark .install-banner.desktop,
html.dark .install-banner.mobile,
html.dark .update-banner {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

html.dark .connection-status {
  background: var(--vp-c-bg-soft);
}

/* Animation */
@keyframes slideInUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.install-banner.mobile {
  animation: slideInUp 0.3s ease-out;
}

.install-banner.desktop,
.update-banner {
  animation: slideInRight 0.3s ease-out;
}
</style>