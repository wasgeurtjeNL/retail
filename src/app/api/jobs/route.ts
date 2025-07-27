// =====================================================
// JOBS API - Background Job Status & Management
// Beheert job status updates en progress tracking
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { queueManager } from '@/lib/queue-manager'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { searchParams } = new URL(request.url)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobId = searchParams.get('job_id')
    const status = searchParams.get('status')
    const isAdmin = searchParams.get('admin') === 'true'

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Jobs API] Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check admin permissions
    if (isAdmin && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get specific job by ID
    if (jobId) {
      const job = await queueManager.getJobStatus(jobId)
      
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }

      // Check if user owns this job (unless admin)
      if (!isAdmin && job.profile_id !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      return NextResponse.json({
        success: true,
        job: job
      })
    }

    // Get jobs with filters
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceSupabase
      .from('background_jobs')
      .select(`
        *,
        profiles (
          id,
          email,
          company_name,
          full_name
        )
      `)

    // Apply filters
    if (!isAdmin) {
      query = query.eq('profile_id', user.id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false }).limit(50)

    const { data: jobs, error: jobsError } = await query

    if (jobsError) {
      console.error('[Jobs API] Error fetching jobs:', jobsError)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    // Get queue statistics
    const queueStats = await queueManager.getQueueStats()

    return NextResponse.json({
      success: true,
      jobs: jobs || [],
      queue_stats: queueStats,
      total_count: jobs?.length || 0
    })

  } catch (error) {
    console.error('[Jobs API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, job_id, job_type, input_data, options } = body

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    switch (action) {
      case 'create':
        // Create new job
        if (!job_type || !input_data) {
          return NextResponse.json({ 
            error: 'job_type and input_data are required' 
          }, { status: 400 })
        }

        try {
          const jobId = await queueManager.addJob(
            job_type,
            user.id,
            input_data,
            options || {}
          )

          return NextResponse.json({
            success: true,
            job_id: jobId,
            message: 'Job created successfully'
          })
        } catch (error) {
          console.error('[Jobs API] Error creating job:', error)
          return NextResponse.json({ 
            error: 'Failed to create job' 
          }, { status: 500 })
        }

      case 'cancel':
        // Cancel job
        if (!job_id) {
          return NextResponse.json({ 
            error: 'job_id is required' 
          }, { status: 400 })
        }

        // Check if user owns this job (unless admin)
        if (profile.role !== 'admin') {
          const job = await queueManager.getJobStatus(job_id)
          if (!job || job.profile_id !== user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
          }
        }

        try {
          const cancelled = await queueManager.cancelJob(job_id)
          
          if (cancelled) {
            return NextResponse.json({
              success: true,
              message: 'Job cancelled successfully'
            })
          } else {
            return NextResponse.json({ 
              error: 'Job could not be cancelled' 
            }, { status: 400 })
          }
        } catch (error) {
          console.error('[Jobs API] Error cancelling job:', error)
          return NextResponse.json({ 
            error: 'Failed to cancel job' 
          }, { status: 500 })
        }

      case 'retry':
        // Retry failed job (admin only)
        if (profile.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        if (!job_id) {
          return NextResponse.json({ 
            error: 'job_id is required' 
          }, { status: 400 })
        }

        try {
          const serviceSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )

          const { data: result, error } = await serviceSupabase
            .rpc('retry_failed_background_job', { job_id })

          if (error) {
            console.error('[Jobs API] Error retrying job:', error)
            return NextResponse.json({ 
              error: 'Failed to retry job' 
            }, { status: 500 })
          }

          return NextResponse.json({
            success: true,
            message: result ? 'Job queued for retry' : 'Job cannot be retried'
          })
        } catch (error) {
          console.error('[Jobs API] Error retrying job:', error)
          return NextResponse.json({ 
            error: 'Failed to retry job' 
          }, { status: 500 })
        }

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 })
    }

  } catch (error) {
    console.error('[Jobs API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { searchParams } = new URL(request.url)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jobId = searchParams.get('job_id')
    const cleanupExpired = searchParams.get('cleanup_expired') === 'true'

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Admin-only cleanup expired jobs
    if (cleanupExpired) {
      if (profile.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }

      try {
        const serviceSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: result, error } = await serviceSupabase
          .rpc('cleanup_expired_background_jobs')

        if (error) {
          console.error('[Jobs API] Error cleaning up expired jobs:', error)
          return NextResponse.json({ 
            error: 'Failed to cleanup expired jobs' 
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: `Cleaned up ${result} expired jobs`
        })
      } catch (error) {
        console.error('[Jobs API] Error cleaning up expired jobs:', error)
        return NextResponse.json({ 
          error: 'Failed to cleanup expired jobs' 
        }, { status: 500 })
      }
    }

    // Delete specific job
    if (jobId) {
      // Check if user owns this job (unless admin)
      if (profile.role !== 'admin') {
        const job = await queueManager.getJobStatus(jobId)
        if (!job || job.profile_id !== user.id) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }

      try {
        const serviceSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error } = await serviceSupabase
          .from('background_jobs')
          .delete()
          .eq('id', jobId)

        if (error) {
          console.error('[Jobs API] Error deleting job:', error)
          return NextResponse.json({ 
            error: 'Failed to delete job' 
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Job deleted successfully'
        })
      } catch (error) {
        console.error('[Jobs API] Error deleting job:', error)
        return NextResponse.json({ 
          error: 'Failed to delete job' 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      error: 'job_id or cleanup_expired parameter required' 
    }, { status: 400 })

  } catch (error) {
    console.error('[Jobs API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 