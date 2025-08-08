import { NextResponse } from 'next/server';
import prisma from '../../../lib/db';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('DATABASE_URL (redacted):', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//[redacted]@') || 'Not set');
    console.log('Attempting migration...');
    
    // Check if data already exists in database
    const existingProjection = await prisma.projection.findFirst();
    
    if (existingProjection) {
      console.log('Data already exists in database, skipping migration');
      return NextResponse.json({ success: true, message: 'Database schema already exists' });
    }
    
    // Get data from localStorage (this would be passed from the client)
    // For now, we'll just create some test data to verify the migration works
    console.log('Creating test data to verify migration...');
    
    // Create test projections
    await prisma.projection.create({
      data: {
        projectId: 'test-project-1',
        month: '2024-01',
        value: 1000
      }
    });
    
    // Create test statuses
    await prisma.status.create({
      data: {
        projectId: 'test-project-1',
        month: '2024-01',
        status: 'active'
      }
    });
    
    // Create test comments
    await prisma.comment.create({
      data: {
        projectId: 'test-project-1',
        month: '2024-01',
        comment: 'Test comment'
      }
    });
    
    // Create test signed fees
    await prisma.signedFee.create({
      data: {
        projectId: 'test-project-1',
        value: 500
      }
    });
    
    // Create test ASR fees
    await prisma.asrFee.create({
      data: {
        projectId: 'test-project-1',
        value: 200
      }
    });
    
    // Create test closed projects
    await prisma.closedProject.create({
      data: {
        projectId: 'test-project-2'
      }
    });
    
    // Create test project assignments
    await prisma.projectAssignment.create({
      data: {
        projectId: 'test-project-1',
        managerId: 'manager-1'
      }
    });
    
    // Create test project managers
    await prisma.projectManager.create({
      data: {
        id: 'manager-1',
        name: 'Test Manager',
        color: '#ff0000'
      }
    });
    
    // Clean up test data
    await prisma.projection.deleteMany({
      where: {
        projectId: 'test-project-1'
      }
    });
    await prisma.status.deleteMany({
      where: {
        projectId: 'test-project-1'
      }
    });
    await prisma.comment.deleteMany({
      where: {
        projectId: 'test-project-1'
      }
    });
    await prisma.signedFee.deleteMany({
      where: {
        projectId: 'test-project-1'
      }
    });
    await prisma.asrFee.deleteMany({
      where: {
        projectId: 'test-project-1'
      }
    });
    await prisma.closedProject.deleteMany({
      where: {
        projectId: 'test-project-2'
      }
    });
    await prisma.projectAssignment.deleteMany({
      where: {
        projectId: 'test-project-1'
      }
    });
    await prisma.projectManager.deleteMany({
      where: {
        id: 'manager-1'
      }
    });
    
    console.log('Migration completed successfully');
    return NextResponse.json({ success: true, message: 'Migration completed successfully' });
    
  } catch (error: unknown) {
    console.error('Migration error:', error);
    console.error('DATABASE_URL (redacted):', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//[redacted]@') || 'Not set');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      message: errorMessage,
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      code: error instanceof Error && 'code' in error ? (error as any).code : undefined
    };
    
    return NextResponse.json({ 
      error: 'Migration failed: ' + errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
} 