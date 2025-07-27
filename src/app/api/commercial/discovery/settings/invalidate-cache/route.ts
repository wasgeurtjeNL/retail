import { NextResponse } from 'next/server';
import { invalidateConfigCache } from '@/lib/discovery-config-loader';

// Invalidate de discovery configuratie cache
// Wordt aangeroepen na het maken/wijzigen van configuraties
export async function POST() {
  console.log('[API] Discovery Settings Cache Invalidation - Clearing cache');
  
  try {
    invalidateConfigCache();
    
    console.log('[API] Discovery configuration cache cleared successfully');
    return NextResponse.json({ 
      success: true,
      message: 'Discovery configuration cache has been invalidated'
    });

  } catch (error: any) {
    console.error('[API] Error invalidating cache:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate cache', details: error.message },
      { status: 500 }
    );
  }
} 