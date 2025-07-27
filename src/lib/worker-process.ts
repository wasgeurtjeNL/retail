// =====================================================
// WORKER PROCESS - Background Job Processing
// Beheert automatische queue processing
// =====================================================

import { startQueueWorker, stopQueueWorker } from './queue-manager'

// Worker process state
let isWorkerRunning = false
let workerStartTime: Date | null = null

// Environment check
const isProduction = process.env.NODE_ENV === 'production'
const isStaging = (process.env.NODE_ENV as string) === 'staging' || process.env.VERCEL_ENV === 'preview'
const isProductionOrStaging = isProduction || isStaging
const isDevelopment = process.env.NODE_ENV === 'development'

// Configuration
const WORKER_CONFIG = {
  autoStart: process.env.QUEUE_WORKER_AUTO_START !== 'false', // Default true
  enableInDevelopment: process.env.QUEUE_WORKER_DEV_MODE === 'true', // Default false
  healthCheckInterval: 30000, // 30 seconds
  maxRestartAttempts: 3,
  restartDelay: 5000 // 5 seconds
}

// Worker health tracking
let restartAttempts = 0
let lastHealthCheck: Date | null = null
let healthCheckInterval: NodeJS.Timeout | null = null

// Initialize worker process
export async function initializeWorkerProcess(): Promise<void> {
  console.log('[WorkerProcess] Initializing worker process...')
  
  // Check if worker should start
  if (!shouldStartWorker()) {
    console.log('[WorkerProcess] Worker not starting - conditions not met')
    return
  }

  try {
    await startWorkerProcess()
    console.log('[WorkerProcess] Worker process initialized successfully')
  } catch (error) {
    console.error('[WorkerProcess] Failed to initialize worker process:', error)
    
    // Attempt restart if allowed
    if (restartAttempts < WORKER_CONFIG.maxRestartAttempts) {
      console.log(`[WorkerProcess] Attempting restart in ${WORKER_CONFIG.restartDelay}ms...`)
      setTimeout(async () => {
        restartAttempts++
        await initializeWorkerProcess()
      }, WORKER_CONFIG.restartDelay)
    } else {
      console.error('[WorkerProcess] Max restart attempts reached. Worker disabled.')
    }
  }
}

// Check if worker should start
function shouldStartWorker(): boolean {
  // Auto-start disabled
  if (!WORKER_CONFIG.autoStart) {
    console.log('[WorkerProcess] Auto-start disabled via environment variable')
    return false
  }

  // Development mode check
  if (isDevelopment && !WORKER_CONFIG.enableInDevelopment) {
    console.log('[WorkerProcess] Development mode - worker disabled (set QUEUE_WORKER_DEV_MODE=true to enable)')
    return false
  }

  // Production/staging always runs
  if (isProductionOrStaging) {
    console.log('[WorkerProcess] Production/staging mode - worker enabled')
    return true
  }

  // Development with explicit enable
  if (isDevelopment && WORKER_CONFIG.enableInDevelopment) {
    console.log('[WorkerProcess] Development mode - worker explicitly enabled')
    return true
  }

  return false
}

// Start worker process
export async function startWorkerProcess(): Promise<void> {
  if (isWorkerRunning) {
    console.log('[WorkerProcess] Worker already running')
    return
  }

  console.log('[WorkerProcess] Starting queue worker...')
  
  try {
    await startQueueWorker()
    isWorkerRunning = true
    workerStartTime = new Date()
    restartAttempts = 0 // Reset on successful start
    
    // Start health monitoring
    startHealthMonitoring()
    
    console.log('[WorkerProcess] Queue worker started successfully')
  } catch (error) {
    console.error('[WorkerProcess] Failed to start queue worker:', error)
    throw error
  }
}

// Stop worker process
export async function stopWorkerProcess(): Promise<void> {
  if (!isWorkerRunning) {
    console.log('[WorkerProcess] Worker not running')
    return
  }

  console.log('[WorkerProcess] Stopping queue worker...')
  
  try {
    // Stop health monitoring
    stopHealthMonitoring()
    
    await stopQueueWorker()
    isWorkerRunning = false
    workerStartTime = null
    
    console.log('[WorkerProcess] Queue worker stopped successfully')
  } catch (error) {
    console.error('[WorkerProcess] Failed to stop queue worker:', error)
    throw error
  }
}

// Health monitoring
function startHealthMonitoring(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
  }

  healthCheckInterval = setInterval(async () => {
    try {
      await performHealthCheck()
    } catch (error) {
      console.error('[WorkerProcess] Health check failed:', error)
    }
  }, WORKER_CONFIG.healthCheckInterval)

  console.log('[WorkerProcess] Health monitoring started')
}

function stopHealthMonitoring(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
  console.log('[WorkerProcess] Health monitoring stopped')
}

// Perform health check
async function performHealthCheck(): Promise<void> {
  if (!isWorkerRunning) {
    return
  }

  try {
    lastHealthCheck = new Date()
    
    // Basic health check - could be extended with more sophisticated checks
    const uptime = workerStartTime ? Date.now() - workerStartTime.getTime() : 0
    
    console.log(`[WorkerProcess] Health check - Worker running for ${Math.round(uptime / 1000)}s`)
    
    // Could add checks for:
    // - Database connectivity
    // - Queue depth
    // - Memory usage
    // - Processing errors
    
  } catch (error) {
    console.error('[WorkerProcess] Health check error:', error)
    
    // Could trigger restart on health check failure
    if (restartAttempts < WORKER_CONFIG.maxRestartAttempts) {
      console.log('[WorkerProcess] Health check failed, attempting restart...')
      await restartWorkerProcess()
    }
  }
}

// Restart worker process
async function restartWorkerProcess(): Promise<void> {
  console.log('[WorkerProcess] Restarting worker process...')
  
  try {
    if (isWorkerRunning) {
      await stopWorkerProcess()
    }
    
    await new Promise(resolve => setTimeout(resolve, WORKER_CONFIG.restartDelay))
    await startWorkerProcess()
    
    console.log('[WorkerProcess] Worker process restarted successfully')
  } catch (error) {
    console.error('[WorkerProcess] Failed to restart worker process:', error)
    restartAttempts++
    
    if (restartAttempts < WORKER_CONFIG.maxRestartAttempts) {
      console.log(`[WorkerProcess] Scheduling another restart attempt in ${WORKER_CONFIG.restartDelay}ms...`)
      setTimeout(async () => {
        await restartWorkerProcess()
      }, WORKER_CONFIG.restartDelay)
    } else {
      console.error('[WorkerProcess] Max restart attempts reached. Worker disabled.')
    }
  }
}

// Get worker status
export function getWorkerStatus(): {
  running: boolean
  startTime: Date | null
  uptime: number
  restartAttempts: number
  lastHealthCheck: Date | null
  config: typeof WORKER_CONFIG
} {
  const uptime = workerStartTime ? Date.now() - workerStartTime.getTime() : 0
  
  return {
    running: isWorkerRunning,
    startTime: workerStartTime,
    uptime,
    restartAttempts,
    lastHealthCheck,
    config: WORKER_CONFIG
  }
}

// Graceful shutdown handler
export function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`[WorkerProcess] Received ${signal}, shutting down gracefully...`)
    
    try {
      await stopWorkerProcess()
      console.log('[WorkerProcess] Graceful shutdown completed')
      process.exit(0)
    } catch (error) {
      console.error('[WorkerProcess] Error during shutdown:', error)
      process.exit(1)
    }
  }

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGUSR2', () => shutdown('SIGUSR2')) // nodemon restart
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('[WorkerProcess] Uncaught exception:', error)
    shutdown('uncaughtException')
  })
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[WorkerProcess] Unhandled rejection at:', promise, 'reason:', reason)
    shutdown('unhandledRejection')
  })
}

// Manual worker control (for admin interface)
export const WorkerControl = {
  async start() {
    return startWorkerProcess()
  },
  
  async stop() {
    return stopWorkerProcess()
  },
  
  async restart() {
    return restartWorkerProcess()
  },
  
  getStatus() {
    return getWorkerStatus()
  },
  
  async forceHealthCheck() {
    return performHealthCheck()
  }
}

// Export for application initialization
export default {
  initialize: initializeWorkerProcess,
  start: startWorkerProcess,
  stop: stopWorkerProcess,
  restart: restartWorkerProcess,
  getStatus: getWorkerStatus,
  setupGracefulShutdown,
  WorkerControl
} 