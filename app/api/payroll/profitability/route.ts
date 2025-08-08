import { NextRequest, NextResponse } from 'next/server';
import { payrollService } from '../../../../lib/payroll';
import { processTimeEntries, generateProjectProfitabilityReport, generateEmployeeProfitabilityReport } from '../../../../lib/payroll';
import { clockifyService } from '../../../../lib/clockify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'process-time-entries': {
        const { clockifyEntries, clockifyUsers, projects } = data;
        const employeeTimeEntries = await processTimeEntries(clockifyEntries, clockifyUsers, projects);
        return NextResponse.json({ employeeTimeEntries });
      }

      case 'project-profitability': {
        const { projectId, startDate, endDate, employeeTimeEntries, revenue } = data;
        const projectReport = await generateProjectProfitabilityReport(
          projectId, startDate, endDate, employeeTimeEntries, revenue
        );
        return NextResponse.json({ report: projectReport });
      }

      case 'employee-profitability': {
        const { employeeId, startDate: empStartDate, endDate: empEndDate, employeeTimeEntries: empTimeEntries } = data;
        const employeeReport = await generateEmployeeProfitabilityReport(
          employeeId, empStartDate, empEndDate, empTimeEntries
        );
        return NextResponse.json({ report: employeeReport });
      }

      case 'full-analysis': {
        // Get Clockify data
        const clockifyUsers = await clockifyService.getUser();
        const clockifyProjects = await clockifyService.getProjects();
        const allTimeEntries = await clockifyService.getAllTimeEntries(
          data.startDate, data.endDate
        );

        // Process time entries with payroll data
        const processedTimeEntries = await processTimeEntries(
          allTimeEntries, [clockifyUsers], clockifyProjects
        );

        // Generate project profitability reports
        const projectReports = [];
        for (const project of clockifyProjects) {
          const projectEntries = processedTimeEntries.filter(entry => entry.projectId === project.id);
          if (projectEntries.length > 0) {
            const revenue = data.projectRevenues?.[project.id] || 0;
            const report = await generateProjectProfitabilityReport(
              project.id, data.startDate, data.endDate, processedTimeEntries, revenue
            );
            projectReports.push(report);
          }
        }

        return NextResponse.json({
          timeEntries: processedTimeEntries,
          projectReports,
          summary: {
            totalProjects: projectReports.length,
            totalHours: processedTimeEntries.reduce((sum, entry) => sum + entry.hours, 0),
            totalCost: processedTimeEntries.reduce((sum, entry) => sum + entry.totalCost, 0),
            totalRevenue: projectReports.reduce((sum, report) => sum + report.totalRevenue, 0),
            totalProfit: projectReports.reduce((sum, report) => sum + report.grossProfit, 0)
          }
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in profitability analysis:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
