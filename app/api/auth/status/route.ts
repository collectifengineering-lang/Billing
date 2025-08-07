import { NextRequest, NextResponse } from 'next/server';
import { zohoService } from '@/lib/zoho';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const status = zohoService.getTokenStatus();
    
    return NextResponse.json({
      success: true,
      status: {
        hasToken: status.hasToken,
        expiresIn: Math.round(status.expiresIn / 1000 / 60), // minutes
        isExpired: status.isExpired,
        expiresAt: new Date(status.expiresIn + Date.now()).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting token status:', error);
    return NextResponse.json(
      { error: 'Failed to get token status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'refresh') {
      await zohoService.forceRefreshToken();
      const status = zohoService.getTokenStatus();
      
      return NextResponse.json({
        success: true,
        message: 'Token refreshed successfully',
        status: {
          hasToken: status.hasToken,
          expiresIn: Math.round(status.expiresIn / 1000 / 60), // minutes
          isExpired: status.isExpired,
          expiresAt: new Date(status.expiresIn + Date.now()).toISOString(),
        },
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
} 