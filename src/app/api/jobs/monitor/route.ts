// Background Job Monitoring API Endpoint
// Manual trigger for sales advice generation monitoring

import { NextRequest, NextResponse } from 'next/server';
import { runMonitoringCycle, getMonitoringStats } from '@/lib/background-job-monitor';

/**
 * GET /api/jobs/monitor - Get monitoring statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await getMonitoringStats();
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MONITOR-API] Error getting monitoring stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get monitoring statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/monitor - Manually trigger monitoring cycle
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check for admin users
    // const isAdmin = await checkAdminAccess(request);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    console.log('[MONITOR-API] Manual monitoring cycle triggered');
    
    const startTime = Date.now();
    await runMonitoringCycle();
    const duration = Date.now() - startTime;

    const stats = await getMonitoringStats();

    return NextResponse.json({
      success: true,
      message: 'Monitoring cycle completed successfully',
      duration_ms: duration,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[MONITOR-API] Error running monitoring cycle:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run monitoring cycle',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}