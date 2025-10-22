// Sample data generator for the BillingTable component

export interface MonthlyData {
  month: string;
  billed: number;
}

export interface BillingProject {
  projectId: string;
  projectName: string;
  monthlyData: MonthlyData[];
}

// Generate sample billing data
export function generateSampleBillingData(): BillingProject[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const projects: BillingProject[] = [
    {
      projectId: 'PROJ-001',
      projectName: 'Website Redesign',
      monthlyData: months.map(month => ({
        month,
        billed: Math.floor(Math.random() * 50000) + 10000
      }))
    },
    {
      projectId: 'PROJ-002',
      projectName: 'Mobile App Development',
      monthlyData: months.map(month => ({
        month,
        billed: Math.floor(Math.random() * 80000) + 20000
      }))
    },
    {
      projectId: 'PROJ-003',
      projectName: 'E-commerce Platform',
      monthlyData: months.map(month => ({
        month,
        billed: Math.floor(Math.random() * 60000) + 15000
      }))
    },
    {
      projectId: 'PROJ-004',
      projectName: 'Data Analytics Dashboard',
      monthlyData: months.map(month => ({
        month,
        billed: Math.floor(Math.random() * 40000) + 8000
      }))
    },
    {
      projectId: 'PROJ-005',
      projectName: 'API Integration',
      monthlyData: months.map(month => ({
        month,
        billed: Math.floor(Math.random() * 30000) + 5000
      }))
    }
  ];

  return projects;
}

// Convert existing project data to BillingProject format
export function convertToBillingFormat(projects: any[]): BillingProject[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return projects.map((project, index) => ({
    projectId: project.projectId || project.id || `PROJ-${String(index + 1).padStart(3, '0')}`,
    projectName: project.projectName || project.name || `Project ${index + 1}`,
    monthlyData: months.map(month => ({
      month,
      billed: Math.floor(Math.random() * 50000) + 10000 // Random sample data
    }))
  }));
}
