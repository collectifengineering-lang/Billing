import { NextResponse } from 'next/server';
import { createDatabaseSchema } from '../../../lib/database';

export async function POST() {
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
