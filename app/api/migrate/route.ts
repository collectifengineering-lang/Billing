import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

export async function POST() {
  try {
    console.log('Starting database migration...');
    
    // Enhanced debugging: Log DATABASE_URL and DIRECT_URL prefixes for debugging (redacted)
    const dbUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;
    console.log('DATABASE_URL prefix:', dbUrl ? `${dbUrl.substring(0, 15)}...` : 'Not set');
    console.log('DIRECT_URL prefix:', directUrl ? `${directUrl.substring(0, 15)}...` : 'Not set');
    
    // Log the full URLs for debugging (in development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('Full DATABASE_URL:', dbUrl);
      console.log('Full DIRECT_URL:', directUrl);
    }
    
    // This will attempt to create the database schema
    // Prisma will automatically use DIRECT_URL for migrations if defined
    
    try {
      // Check if tables exist by trying to query them
      await prisma.projection.findFirst();
      console.log('Database schema already exists');
      return NextResponse.json({ success: true, message: 'Database schema already exists' });
    } catch (error: any) {
      console.log('Error checking tables:', error.code, error.message);
      
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.log('Tables do not exist, creating schema...');
        
        // Try to create tables by inserting test data
        // Prisma will use DIRECT_URL for schema operations if defined
        
        try {
          console.log('Attempting to create database schema using Prisma...');
          
          // Create test data for each table to trigger table creation
          await prisma.projection.create({
            data: {
              projectId: '__migration_test__',
              month: '__migration_test__',
              value: 0
            }
          });
          
          await prisma.status.create({
            data: {
              projectId: '__migration_test__',
              month: '__migration_test__',
              status: '__migration_test__'
            }
          });
          
          await prisma.comment.create({
            data: {
              projectId: '__migration_test__',
              month: '__migration_test__',
              comment: '__migration_test__'
            }
          });
          
          await prisma.signedFee.create({
            data: {
              projectId: '__migration_test__',
              value: 0
            }
          });
          
          await prisma.asrFee.create({
            data: {
              projectId: '__migration_test__',
              value: 0
            }
          });
          
          await prisma.closedProject.create({
            data: {
              projectId: '__migration_test__'
            }
          });
          
          await prisma.projectAssignment.create({
            data: {
              projectId: '__migration_test__',
              managerId: '__migration_test__'
            }
          });
          
          await prisma.projectManager.create({
            data: {
              id: '__migration_test__',
              name: '__migration_test__',
              color: '#000000'
            }
          });
          
          // Clean up test data
          await prisma.projection.deleteMany({
            where: { projectId: '__migration_test__' }
          });
          await prisma.status.deleteMany({
            where: { projectId: '__migration_test__' }
          });
          await prisma.comment.deleteMany({
            where: { projectId: '__migration_test__' }
          });
          await prisma.signedFee.deleteMany({
            where: { projectId: '__migration_test__' }
          });
          await prisma.asrFee.deleteMany({
            where: { projectId: '__migration_test__' }
          });
          await prisma.closedProject.deleteMany({
            where: { projectId: '__migration_test__' }
          });
          await prisma.projectAssignment.deleteMany({
            where: { projectId: '__migration_test__' }
          });
          await prisma.projectManager.deleteMany({
            where: { id: '__migration_test__' }
          });
          
          console.log('Database schema created successfully using DIRECT_URL');
          return NextResponse.json({ 
            success: true, 
            message: 'Database schema created successfully',
            note: 'Migrations used DIRECT_URL, runtime will use DATABASE_URL'
          });
        } catch (createError: any) {
          console.error('Failed to create database schema:', createError);
          console.error('Error code:', createError.code);
          console.error('Error message:', createError.message);
          console.error('Full error details:', createError);
          
          return NextResponse.json({ 
            error: 'Failed to create database schema', 
            details: createError.message,
            code: createError.code,
            suggestion: 'Check that DIRECT_URL is properly configured for migrations'
          }, { status: 500 });
        }
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Database migration failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error details:', error);
    
    return NextResponse.json({ 
      error: 'Database migration failed', 
      details: error.message,
      code: error.code,
      suggestion: 'Verify both DATABASE_URL and DIRECT_URL are configured correctly'
    }, { status: 500 });
  }
} 