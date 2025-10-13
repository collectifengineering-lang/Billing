import { NextRequest, NextResponse } from 'next/server';
import { serverCache } from '@/lib/serverCache';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { key } = body;

    if (key) {
      // Invalidate specific cache key
      const deleted = serverCache.delete(key);
      
      if (deleted) {
        console.log(`✅ Cache key "${key}" invalidated`);
        return NextResponse.json({
          success: true,
          message: `Cache key "${key}" invalidated`,
        });
      } else {
        return NextResponse.json({
          success: false,
          message: `Cache key "${key}" not found`,
        }, { status: 404 });
      }
    } else {
      // Clear all cache
      serverCache.clear();
      console.log('✅ All cache cleared');
      
      return NextResponse.json({
        success: true,
        message: 'All cache cleared',
      });
    }
  } catch (error) {
    console.error('❌ Error invalidating cache:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to invalidate cache',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = serverCache.getStats();
    
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get cache stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

