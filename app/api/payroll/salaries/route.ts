import { NextRequest, NextResponse } from 'next/server';
import { payrollService } from '../../../../lib/payroll';
import { EmployeeSalary } from '../../../../lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');

    if (employeeId && date) {
      const salary = await payrollService.getEmployeeSalary(employeeId, date);
      return NextResponse.json(salary);
    } else if (employeeId) {
      const salaryHistory = await payrollService.getEmployeeSalaryHistory(employeeId);
      return NextResponse.json(salaryHistory);
    } else {
      return NextResponse.json({ error: 'employeeId parameter is required' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error fetching salary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const salary: EmployeeSalary = await request.json();
    await payrollService.addSalary(salary);
    return NextResponse.json({ success: true, message: 'Salary added successfully' });
  } catch (error: any) {
    console.error('Error adding salary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
