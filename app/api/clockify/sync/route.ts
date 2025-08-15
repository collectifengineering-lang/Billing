import { NextRequest, NextResponse } from 'next/server';
import { clockifyService } from '@/lib/clockify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting Clockify data sync...');
    
    const { startDate, endDate } = await request.json();
    
    // Default to last 30 days if no dates provided
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const syncStartDate = startDate || defaultStartDate.toISOString();
    const syncEndDate = endDate || new Date().toISOString();
    
    console.log(`📅 Syncing data from ${syncStartDate} to ${syncEndDate}`);
    
    // Check if Clockify is configured
    const configStatus = clockifyService.getConfigurationStatus();
    if (!configStatus.configured) {
      return NextResponse.json({
        success: false,
        error: 'Clockify not configured',
        message: 'Please configure CLOCKIFY_API_KEY and CLOCKIFY_WORKSPACE_ID in your environment variables'
      }, { status: 400 });
    }
    
    // Fetch data from Clockify
    const [timeEntries, projects, users] = await Promise.all([
      clockifyService.getAllTimeEntries(syncStartDate, syncEndDate),
      clockifyService.getProjects(),
      clockifyService.getUsers(clockifyService.getConfigurationStatus().hasWorkspaceId ? 
        process.env.CLOCKIFY_WORKSPACE_ID! : '')
    ]);
    
    console.log(`📊 Fetched ${timeEntries.length} time entries, ${projects.length} projects, ${users.length} users`);
    
    let syncResults = {
      timeEntries: { created: 0, updated: 0, errors: 0 },
      projects: { created: 0, updated: 0, errors: 0 },
      users: { created: 0, updated: 0, errors: 0 }
    };
    
    // Sync users
    for (const user of users) {
      try {
        await prisma.clockifyUser.upsert({
          where: { id: user.id },
          update: {
            name: user.name,
            email: user.email,
            workspaceId: user.activeWorkspace || process.env.CLOCKIFY_WORKSPACE_ID!,
            status: user.status || 'ACTIVE',
            updatedAt: new Date()
          },
          create: {
            id: user.id,
            name: user.name,
            email: user.email,
            workspaceId: user.activeWorkspace || process.env.CLOCKIFY_WORKSPACE_ID!,
            status: user.status || 'ACTIVE'
          }
        });
        syncResults.users.created++;
      } catch (error) {
        console.error(`❌ Error syncing user ${user.id}:`, error);
        syncResults.users.errors++;
      }
    }
    
    // Sync projects
    for (const project of projects) {
      try {
        await prisma.clockifyProject.upsert({
          where: { id: project.id },
          update: {
            name: project.name,
            workspaceId: project.workspaceId,
            clientId: project.clientId,
            clientName: project.clientName,
            billable: project.billable,
            archived: project.archived,
            hourlyRate: typeof project.hourlyRate === 'object' ? project.hourlyRate.amount : project.hourlyRate,
            budget: project.budget,
            startDate: project.startDate ? new Date(project.startDate) : null,
            endDate: project.endDate ? new Date(project.endDate) : null,
            updatedAt: new Date()
          },
          create: {
            id: project.id,
            name: project.name,
            workspaceId: project.workspaceId,
            clientId: project.clientId,
            clientName: project.clientName,
            billable: project.billable,
            archived: project.archived,
            hourlyRate: typeof project.hourlyRate === 'object' ? project.hourlyRate.amount : project.hourlyRate,
            budget: project.budget,
            startDate: project.startDate ? new Date(project.startDate) : null,
            endDate: project.endDate ? new Date(project.endDate) : null
          }
        });
        syncResults.projects.created++;
      } catch (error) {
        console.error(`❌ Error syncing project ${project.id}:`, error);
        syncResults.projects.errors++;
      }
    }
    
    // Sync time entries
    for (const entry of timeEntries) {
      try {
        const startTime = new Date(entry.timeInterval?.start || entry.start || syncStartDate);
        const endTime = entry.timeInterval?.end || entry.end ? new Date(entry.timeInterval?.end || entry.end) : null;
        
        await prisma.clockifyTimeEntry.upsert({
          where: { id: entry.id },
          update: {
            description: entry.description,
            userId: entry.userId,
            userName: entry.userName,
            projectId: entry.projectId,
            projectName: entry.projectName,
            billable: entry.billable,
            startTime,
            endTime,
            duration: entry.timeInterval?.duration || 'PT0H',
            hourlyRate: typeof entry.hourlyRate === 'object' ? entry.hourlyRate.amount : entry.hourlyRate,
            costRate: typeof entry.costRate === 'object' ? entry.costRate.amount : entry.costRate,
            tags: entry.tags?.map((tag: any) => tag.name || tag) || [],
            updatedAt: new Date()
          },
          create: {
            id: entry.id,
            description: entry.description,
            userId: entry.userId,
            userName: entry.userName,
            projectId: entry.projectId,
            projectName: entry.projectName,
            billable: entry.billable,
            startTime,
            endTime,
            duration: entry.timeInterval?.duration || 'PT0H',
            hourlyRate: typeof entry.hourlyRate === 'object' ? entry.hourlyRate.amount : entry.hourlyRate,
            costRate: typeof entry.costRate === 'object' ? entry.costRate.amount : entry.costRate,
            tags: entry.tags?.map((tag: any) => tag.name || tag) || []
          }
        });
        syncResults.timeEntries.created++;
      } catch (error) {
        console.error(`❌ Error syncing time entry ${entry.id}:`, error);
        syncResults.timeEntries.errors++;
      }
    }
    
    console.log('✅ Clockify sync completed:', syncResults);
    
    return NextResponse.json({
      success: true,
      message: 'Clockify data synced successfully',
      results: syncResults,
      summary: {
        totalTimeEntries: timeEntries.length,
        totalProjects: projects.length,
        totalUsers: users.length,
        dateRange: { start: syncStartDate, end: syncEndDate }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Clockify sync failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync Clockify data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
