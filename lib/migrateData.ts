import prisma from './prisma';

export async function migrateLocalStorageToDatabase() {
  try {
    console.log('Starting migration from localStorage to database...');

    // Check if database is empty
    const projectionCount = await prisma.projection.count();
    const statusCount = await prisma.status.count();
    const commentCount = await prisma.comment.count();
    const signedFeeCount = await prisma.signedFee.count();
    const asrFeeCount = await prisma.asrFee.count();
    const closedProjectCount = await prisma.closedProject.count();
    const projectAssignmentCount = await prisma.projectAssignment.count();
    const projectManagerCount = await prisma.projectManager.count();

    if (projectionCount > 0 || statusCount > 0 || commentCount > 0 || 
        signedFeeCount > 0 || asrFeeCount > 0 || closedProjectCount > 0 || 
        projectAssignmentCount > 0 || projectManagerCount > 0) {
      console.log('Database already has data, skipping migration');
      return;
    }

    // Get data from localStorage (this will run in the browser)
    if (typeof window !== 'undefined') {
      const monthlyProjections = JSON.parse(localStorage.getItem('monthlyProjections') || '{}');
      const monthlyStatuses = JSON.parse(localStorage.getItem('monthlyStatuses') || '{}');
      const monthlyComments = JSON.parse(localStorage.getItem('monthlyComments') || '{}');
      const signedFees = JSON.parse(localStorage.getItem('signedFees') || '{}');
      const asrFees = JSON.parse(localStorage.getItem('asrFees') || '{}');
      const closedProjects = JSON.parse(localStorage.getItem('closedProjects') || '[]');
      const projectAssignments = JSON.parse(localStorage.getItem('projectAssignments') || '{}');
      const projectManagers = JSON.parse(localStorage.getItem('projectManagers') || '[]');

      // Migrate projections
      for (const [projectId, months] of Object.entries(monthlyProjections)) {
        for (const [month, value] of Object.entries(months as Record<string, number>)) {
          await prisma.projection.upsert({
            where: { projectId_month: { projectId, month } },
            update: { value },
            create: { projectId, month, value },
          });
        }
      }

      // Migrate statuses
      for (const [projectId, months] of Object.entries(monthlyStatuses)) {
        for (const [month, status] of Object.entries(months as Record<string, string>)) {
          await prisma.status.upsert({
            where: { projectId_month: { projectId, month } },
            update: { status },
            create: { projectId, month, status },
          });
        }
      }

      // Migrate comments
      for (const [projectId, months] of Object.entries(monthlyComments)) {
        for (const [month, comment] of Object.entries(months as Record<string, string>)) {
          await prisma.comment.upsert({
            where: { projectId_month: { projectId, month } },
            update: { comment },
            create: { projectId, month, comment },
          });
        }
      }

      // Migrate signed fees
      for (const [projectId, value] of Object.entries(signedFees)) {
        await prisma.signedFee.upsert({
          where: { projectId },
          update: { value: value as number },
          create: { projectId, value: value as number },
        });
      }

      // Migrate ASR fees
      for (const [projectId, value] of Object.entries(asrFees)) {
        await prisma.asrFee.upsert({
          where: { projectId },
          update: { value: value as number },
          create: { projectId, value: value as number },
        });
      }

      // Migrate closed projects
      for (const projectId of closedProjects) {
        await prisma.closedProject.upsert({
          where: { projectId },
          update: {},
          create: { projectId },
        });
      }

      // Migrate project assignments
      for (const [projectId, managerId] of Object.entries(projectAssignments)) {
        await prisma.projectAssignment.upsert({
          where: { projectId },
          update: { managerId: managerId as string },
          create: { projectId, managerId: managerId as string },
        });
      }

      // Migrate project managers
      for (const manager of projectManagers) {
        await prisma.projectManager.upsert({
          where: { id: manager.id },
          update: { name: manager.name, color: manager.color },
          create: { id: manager.id, name: manager.name, color: manager.color },
        });
      }

      console.log('Migration completed successfully');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
} 