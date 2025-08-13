import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get the admin emails from environment
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
    const adminEmailsArray = adminEmails?.split(',').map(email => email.trim()) || [];
    
    return NextResponse.json({
      success: true,
      adminEmails,
      adminEmailsArray,
      envVarExists: !!adminEmails,
      envVarLength: adminEmails?.length || 0,
      message: 'Admin test endpoint working'
    });
  } catch (error) {
    console.error('Admin test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Admin test endpoint failed'
    }, { status: 500 });
  }
}
