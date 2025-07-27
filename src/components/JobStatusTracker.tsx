// =====================================================
// JOB STATUS TRACKER - Real-time Job Progress
// Toont job status met progress bars en real-time updates
// =====================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { PlayIcon, PauseIcon, ArrowPathIcon } from '@heroicons/react/24/solid'

interface JobStatus {
  id: string
  job_type: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retry'
  progress_percentage: number
  current_step?: string
  total_steps?: number
  retry_count: number
  max_retries: number
  created_at: string
  started_at?: string
  completed_at?: string
  expires_at: string
  error_data?: {
    error: string
    failed_at?: string
  }
  output_data?: any
  input_data: {
    websiteUrl?: string
    websites?: string[]
  }
}

interface JobStatusTrackerProps {
  jobId?: string
  websiteUrl?: string
  onJobComplete?: (job: JobStatus) => void
  onJobError?: (job: JobStatus) => void
  refreshInterval?: number
  autoRefresh?: boolean
  compact?: boolean
}

// Status color mapping
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'text-green-600'
    case 'failed':
      return 'text-red-600'
    case 'processing':
      return 'text-blue-600'
    case 'pending':
      return 'text-yellow-600'
    case 'cancelled':
      return 'text-gray-600'
    case 'retry':
      return 'text-orange-600'
    default:
      return 'text-gray-500'
  }
}

// Status icon mapping
const getStatusIcon = (status: string, isLoading: boolean = false) => {
  const className = `h-5 w-5 ${getStatusColor(status)}`
  
  if (isLoading) {
    return <ArrowPathIcon className={`${className} animate-spin`} />
  }
  
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className={className} />
    case 'failed':
      return <XCircleIcon className={className} />
    case 'processing':
      return <PlayIcon className={className} />
    case 'pending':
      return <ClockIcon className={className} />
    case 'cancelled':
      return <PauseIcon className={className} />
    case 'retry':
      return <ArrowPathIcon className={className} />
    default:
      return <ExclamationCircleIcon className={className} />
  }
}

// Progress bar component
const ProgressBar: React.FC<{ 
  percentage: number; 
  status: string; 
  showPercentage?: boolean;
  className?: string;
}> = ({ percentage, status, showPercentage = true, className = '' }) => {
  const getProgressColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'processing':
        return 'bg-blue-500'
      case 'pending':
        return 'bg-yellow-500'
      case 'cancelled':
        return 'bg-gray-500'
      case 'retry':
        return 'bg-orange-500'
      default:
        return 'bg-gray-300'
    }
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-sm font-medium text-gray-700 min-w-[3rem]">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

// Main component
export const JobStatusTracker: React.FC<JobStatusTrackerProps> = ({
  jobId,
  websiteUrl,
  onJobComplete,
  onJobError,
  refreshInterval = 2000,
  autoRefresh = true,
  compact = false
}) => {
  const [job, setJob] = useState<JobStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Fetch job status
  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/jobs?job_id=${jobId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job status')
      }

      if (data.success && data.job) {
        const previousJob = job
        setJob(data.job)
        setLastUpdated(new Date())

        // Check for status changes
        if (previousJob && previousJob.status !== data.job.status) {
          if (data.job.status === 'completed') {
            onJobComplete?.(data.job)
          } else if (data.job.status === 'failed') {
            onJobError?.(data.job)
          }
        }
      }
    } catch (err) {
      console.error('[JobStatusTracker] Error fetching job status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [jobId, job, onJobComplete, onJobError])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !jobId) return

    // Initial fetch
    fetchJobStatus()

    // Set up interval for ongoing jobs
    const interval = setInterval(() => {
      if (job?.status && ['pending', 'processing', 'retry'].includes(job.status)) {
        fetchJobStatus()
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [jobId, autoRefresh, refreshInterval, fetchJobStatus, job?.status])

  // Manual refresh
  const handleRefresh = () => {
    fetchJobStatus()
  }

  // Cancel job
  const handleCancel = async () => {
    if (!jobId) return

    try {
      setIsLoading(true)
      
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel',
          job_id: jobId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel job')
      }

      if (data.success) {
        // Refresh job status
        await fetchJobStatus()
      }
    } catch (err) {
      console.error('[JobStatusTracker] Error cancelling job:', err)
      setError(err instanceof Error ? err.message : 'Failed to cancel job')
    } finally {
      setIsLoading(false)
    }
  }

  // Format time
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Calculate elapsed time
  const getElapsedTime = (startTime?: string): string => {
    if (!startTime) return '0s'
    
    const start = new Date(startTime)
    const now = new Date()
    const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000)
    
    if (elapsed < 60) return `${elapsed}s`
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
    
    const hours = Math.floor(elapsed / 3600)
    const minutes = Math.floor((elapsed % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  // Get estimated time remaining
  const getEstimatedTimeRemaining = (progress: number, startTime?: string): string => {
    if (!startTime || progress <= 0) return 'Unknown'
    
    const start = new Date(startTime)
    const now = new Date()
    const elapsed = (now.getTime() - start.getTime()) / 1000
    
    if (progress >= 100) return 'Complete'
    
    const estimatedTotal = (elapsed / progress) * 100
    const remaining = Math.max(0, estimatedTotal - elapsed)
    
    if (remaining < 60) return `${Math.round(remaining)}s`
    if (remaining < 3600) return `${Math.round(remaining / 60)}m`
    
    const hours = Math.floor(remaining / 3600)
    const minutes = Math.round((remaining % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <XCircleIcon className="h-5 w-5 text-red-600" />
          <span className="text-sm text-red-700">Error: {error}</span>
          <button
            onClick={handleRefresh}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <ArrowPathIcon className="h-5 w-5 text-gray-500 animate-spin" />
          <span className="text-sm text-gray-600">Loading job status...</span>
        </div>
      </div>
    )
  }

  // Compact view
  if (compact) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(job.status, isLoading)}
            <span className="text-sm font-medium text-gray-900 capitalize">
              {job.status}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {job.progress_percentage}%
            </span>
            {['pending', 'processing', 'retry'].includes(job.status) && (
              <button
                onClick={handleCancel}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        <ProgressBar 
          percentage={job.progress_percentage} 
          status={job.status} 
          showPercentage={false}
          className="mt-2"
        />
      </div>
    )
  }

  // Full view
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon(job.status, isLoading)}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 capitalize">
              {job.job_type.replace('_', ' ')} - {job.status}
            </h3>
            <p className="text-sm text-gray-600">
              {job.input_data.websiteUrl || `${job.input_data.websites?.length || 0} websites`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          {['pending', 'processing', 'retry'].includes(job.status) && (
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {job.current_step || 'Processing...'}
          </span>
          <span className="text-sm text-gray-500">
            {job.progress_percentage}% Complete
          </span>
        </div>
        <ProgressBar 
          percentage={job.progress_percentage} 
          status={job.status} 
          showPercentage={false}
        />
      </div>

      {/* Status Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="font-medium text-gray-700">Created:</span>
          <br />
          <span className="text-gray-600">{formatTime(job.created_at)}</span>
        </div>
        
        {job.started_at && (
          <div>
            <span className="font-medium text-gray-700">Started:</span>
            <br />
            <span className="text-gray-600">{formatTime(job.started_at)}</span>
          </div>
        )}
        
        {job.status === 'processing' && job.started_at && (
          <div>
            <span className="font-medium text-gray-700">Elapsed:</span>
            <br />
            <span className="text-gray-600">{getElapsedTime(job.started_at)}</span>
          </div>
        )}
        
        {job.status === 'processing' && job.started_at && (
          <div>
            <span className="font-medium text-gray-700">ETA:</span>
            <br />
            <span className="text-gray-600">
              {getEstimatedTimeRemaining(job.progress_percentage, job.started_at)}
            </span>
          </div>
        )}
        
        {job.completed_at && (
          <div>
            <span className="font-medium text-gray-700">Completed:</span>
            <br />
            <span className="text-gray-600">{formatTime(job.completed_at)}</span>
          </div>
        )}
      </div>

      {/* Error Information */}
      {job.status === 'failed' && job.error_data && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <h4 className="text-sm font-medium text-red-800">Error Details:</h4>
          <p className="text-sm text-red-700 mt-1">{job.error_data.error}</p>
          {job.retry_count > 0 && (
            <p className="text-xs text-red-600 mt-1">
              Retry attempts: {job.retry_count}/{job.max_retries}
            </p>
          )}
        </div>
      )}

      {/* Success Information */}
      {job.status === 'completed' && job.output_data && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-sm font-medium text-green-800">Results:</h4>
          <div className="text-sm text-green-700 mt-1">
            {job.output_data.analysis_id && (
              <p>Analysis ID: {job.output_data.analysis_id}</p>
            )}
            {job.output_data.business_type && (
              <p>Business Type: {job.output_data.business_type}</p>
            )}
            {job.output_data.confidence_score && (
              <p>Confidence: {Math.round(job.output_data.confidence_score * 100)}%</p>
            )}
          </div>
        </div>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleString('nl-NL')}
          </p>
        </div>
      )}
    </div>
  )
}

export default JobStatusTracker 