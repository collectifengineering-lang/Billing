import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the user email from query parameters or headers
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');
    
    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'User email is required'
      }, { status: 400 });
    }

    // Check admin status using the same logic as the client
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    const isAdmin = adminEmails.includes(userEmail) || userEmail.endsWith('@collectif.nyc');

    return NextResponse.json({
      success: true,
      userEmail,
      isAdmin,
      adminEmails,
      rawEnvVar: process.env.NEXT_PUBLIC_ADMIN_EMAILS,
      envVarExists: !!process.env.NEXT_PUBLIC_ADMIN_EMAILS,
      domainCheck: userEmail.endsWith('@collectif.nyc')
    });
  } catch (error) {
    console.error('Admin test API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check admin status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
