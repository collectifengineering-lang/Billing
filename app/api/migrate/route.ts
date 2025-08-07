import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/database';

export async function POST() {
  try {
    console.log('Starting database migration...');
    
    // This will attempt to create the database schema
    // We'll use a more direct approach by creating the tables manually
    
    try {
      // Check if tables exist by trying to query them
      await prisma.projection.findFirst();
      console.log('Database schema already exists');
      return NextResponse.json({ success: true, message: 'Database schema already exists' });
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.log('Tables do not exist, creating schema...');
        
        // Try to create tables by inserting test data
        // This should trigger Prisma Accelerate to create the tables
        
        try {
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
          
          console.log('Database schema created successfully');
          return NextResponse.json({ success: true, message: 'Database schema created successfully' });
        } catch (createError: any) {
          console.error('Failed to create database schema:', createError);
          return NextResponse.json({ 
            error: 'Failed to create database schema', 
            details: createError.message 
          }, { status: 500 });
        }
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Database migration failed:', error);
    return NextResponse.json({ 
      error: 'Database migration failed', 
      details: error.message 
    }, { status: 500 });
  }
} 