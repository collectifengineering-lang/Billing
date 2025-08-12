import { NextRequest, NextResponse } from 'next/server';
import { payrollService } from '../../../../lib/payroll';
import { BambooHRConfig } from '../../../../lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'configure': {
        const config: BambooHRConfig = data;
        await payrollService.configureBambooHR(config);
        return NextResponse.json({ 
          success: true, 
          message: `BambooHR configured for subdomain: ${config.subdomain}` 
        });
      }

      case 'import-data': {
        const importResult = await payrollService.importSalariesFromBambooHR();
        return NextResponse.json({ 
          success: true, 
          result: importResult 
        });
      }

      case 'test-connection': {
        // Test the BambooHR connection by trying to get company info
        const { configureBambooHR } = await import('../../../../lib/bamboohr');
        const testConfig: BambooHRConfig = data;
        configureBambooHR(testConfig);
        
        const { getBambooHRService } = await import('../../../../lib/bamboohr');
        const service = getBambooHRService();
        const companyInfo = await service.getCompanyInfo();
        
        return NextResponse.json({ 
          success: true, 
          message: 'BambooHR connection successful',
          companyInfo 
        });
      }

      case 'get-employees': {
        const { configureBambooHR: configureTest, getBambooHRService: getTestService } = await import('../../../../lib/bamboohr');
        const testConfig: BambooHRConfig = data;
        configureTest(testConfig);
        const testService = getTestService();
        const employees = await testService.getAllEmployees();
        
        return NextResponse.json({ 
          success: true, 
          employees 
        });
      }

      case 'get-compensation': {
        const { configureBambooHR: configureTest2, getBambooHRService: getTestService2 } = await import('../../../../lib/bamboohr');
        const testConfig: BambooHRConfig = data.config;
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
    console.error('Error in BambooHR integration:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
