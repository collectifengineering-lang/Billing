import { NextRequest, NextResponse } from 'next/server';
import { payrollService } from '../../../../lib/payroll';
import { Employee } from '../../../../lib/types';

export async function GET() {
  try {
    const employees = await payrollService.getAllEmployees();
    return NextResponse.json(employees);
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee: Employee = await request.json();
    await payrollService.addEmployee(employee);
    return NextResponse.json({ success: true, message: 'Employee added successfully' });
  } catch (error: any) {
    console.error('Error adding employee:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
