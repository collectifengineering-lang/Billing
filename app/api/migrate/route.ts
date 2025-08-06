import { NextResponse } from 'next/server';
import { migrateLocalStorageToDatabase } from '../../../lib/migrateData';

export async function POST() {
  try {
    await migrateLocalStorageToDatabase();
    return NextResponse.json({ success: true, message: 'Migration completed' });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
} 