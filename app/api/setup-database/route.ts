import { NextResponse } from 'next/server';
import { createDatabaseSchema } from '../../../lib/database';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export async function POST() {
  // Check if prisma client is available
  if (!prisma) {
    return NextResponse.json({ 
      error: 'Database client not available' 
    }, { status: 500 });
  }

  try {
    console.log('Setting up database schema...');
    
    const success = await createDatabaseSchema();
    
    if (success) {
      console.log('Database schema setup completed successfully');
      return NextResponse.json({ success: true, message: 'Database schema setup completed' });
    } else {
      console.error('Database schema setup failed');
      return NextResponse.json({ error: 'Database schema setup failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Database setup failed:', error);
    return NextResponse.json({ error: 'Database setup failed' }, { status: 500 });
  }
}
