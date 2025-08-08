import { NextRequest, NextResponse } from 'next/server';
import { payrollService } from '../../../../lib/payroll';
import { SurePayrollConfig } from '../../../../lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'configure': {
        const config: SurePayrollConfig = data;
        await payrollService.configureSurePayroll(config);
        return NextResponse.json({ 
          success: true, 
          message: `SurePayroll configured for client ID: ${config.clientId}` 
        });
      }

      case 'import-data': {
        const importResult = await payrollService.importSalariesFromSurePayroll();
        return NextResponse.json({ 
          success: true, 
          result: importResult 
        });
      }

      case 'test-connection': {
        // Test the SurePayroll connection by trying to get company info
        const { configureSurePayroll } = await import('../../../../lib/surepayroll');
        const testConfig: SurePayrollConfig = data;
        configureSurePayroll(testConfig);
        
        const { getSurePayrollService } = await import('../../../../lib/surepayroll');
        const service = getSurePayrollService();
        const companyInfo = await service.getCompanyInfo();
        
        return NextResponse.json({ 
          success: true, 
          message: 'SurePayroll connection successful',
          companyInfo 
        });
      }

      case 'get-employees': {
        const { configureSurePayroll: configureTest, getSurePayrollService: getTestService } = await import('../../../../lib/surepayroll');
        const testConfig: SurePayrollConfig = data;
        configureTest(testConfig);
        const testService = getTestService();
        const employees = await testService.getAllEmployees();
        
        return NextResponse.json({ 
          success: true, 
          employees 
        });
      }

      case 'get-compensation': {
        const { configureSurePayroll: configureTest2, getSurePayrollService: getTestService2 } = await import('../../../../lib/surepayroll');
        const testConfig: SurePayrollConfig = data.config;
        const employeeId = data.employeeId;
        configureTest2(testConfig);
        const testService2 = getTestService2();
        const compensation = await testService2.getEmployeeCompensation(employeeId);
        
        return NextResponse.json({ 
          success: true, 
          compensation 
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in SurePayroll integration:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
