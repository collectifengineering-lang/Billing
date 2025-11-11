/**
 * Environment Variable Validation Utility
 * Validates required environment variables at startup
 */

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

interface EnvConfig {
  required: string[];
  optional: string[];
  validate?: (env: Record<string, string | undefined>) => { valid: boolean; warnings: string[] };
}

// Environment variable configuration
const envConfig: EnvConfig = {
  required: [
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXT_PUBLIC_AZURE_AD_CLIENT_ID',
    'NEXT_PUBLIC_AZURE_AD_TENANT_ID',
  ],
  optional: [
    'NEXT_PUBLIC_ADMIN_EMAILS',
    'ZOHO_CLIENT_ID',
    'ZOHO_CLIENT_SECRET',
    'ZOHO_REFRESH_TOKEN',
    'ZOHO_ORGANIZATION_ID',
    'CLOCKIFY_API_KEY',
    'CLOCKIFY_WORKSPACE_ID',
    'BAMBOOHR_SUBDOMAIN',
    'BAMBOOHR_API_KEY',
    'BAMBOOHR_WEBHOOK_SECRET',
    'ZOHO_FORCE_REFRESH',
    'ZOHO_ACCOUNTS_BASE',
    'ZOHO_API_BASE',
  ],
  validate: (env) => {
    const warnings: string[] = [];

    // Validate DATABASE_URL format
    if (env.DATABASE_URL && !env.DATABASE_URL.startsWith('postgresql://')) {
      warnings.push('DATABASE_URL should start with postgresql://');
    }

    // Validate DIRECT_URL format
    if (env.DIRECT_URL && !env.DIRECT_URL.startsWith('postgresql://')) {
      warnings.push('DIRECT_URL should start with postgresql://');
    }

    // Validate admin emails format
    if (env.NEXT_PUBLIC_ADMIN_EMAILS) {
      const emails = env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map(e => e.trim());
      const invalidEmails = emails.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      if (invalidEmails.length > 0) {
        warnings.push(`Invalid admin email format: ${invalidEmails.join(', ')}`);
      }
    }

    // Warn if Zoho credentials are partially set
    const zohoVars = [
      'ZOHO_CLIENT_ID',
      'ZOHO_CLIENT_SECRET',
      'ZOHO_REFRESH_TOKEN',
      'ZOHO_ORGANIZATION_ID',
    ];
    const setZohoVars = zohoVars.filter(v => env[v]);
    if (setZohoVars.length > 0 && setZohoVars.length < zohoVars.length) {
      warnings.push(`Zoho integration is partially configured. Missing: ${zohoVars.filter(v => !env[v]).join(', ')}`);
    }

    // Warn if Clockify credentials are partially set
    const clockifyVars = ['CLOCKIFY_API_KEY', 'CLOCKIFY_WORKSPACE_ID'];
    const setClockifyVars = clockifyVars.filter(v => env[v]);
    if (setClockifyVars.length === 1) {
      warnings.push(`Clockify integration is partially configured. Missing: ${clockifyVars.filter(v => !env[v]).join(', ')}`);
    }

    // Warn if BambooHR credentials are partially set
    const bamboohrVars = ['BAMBOOHR_SUBDOMAIN', 'BAMBOOHR_API_KEY'];
    const setBamboohrVars = bamboohrVars.filter(v => env[v]);
    if (setBamboohrVars.length === 1) {
      warnings.push(`BambooHR integration is partially configured. Missing: ${bamboohrVars.filter(v => !env[v]).join(', ')}`);
    }

    return { valid: true, warnings };
  },
};

/**
 * Validate environment variables
 */
export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of envConfig.required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Run custom validation
  if (envConfig.validate) {
    const env = process.env as Record<string, string | undefined>;
    const validationResult = envConfig.validate(env);
    warnings.push(...validationResult.warnings);
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Get environment variable or throw error if missing
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get environment variable with default value
 */
export function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Check if environment variable is set
 */
export function hasEnv(key: string): boolean {
  return !!process.env[key];
}

/**
 * Validate and log environment variables (for server-side only)
 */
export function validateAndLogEnv(): void {
  if (typeof window !== 'undefined') {
    // Skip validation on client-side
    return;
  }

  const result = validateEnv();

  if (!result.valid) {
    console.error('❌ Missing required environment variables:');
    result.missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these variables in your .env.local file or deployment environment.');
    throw new Error(`Missing required environment variables: ${result.missing.join(', ')}`);
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️ Environment variable warnings:');
    result.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
  }

  console.log('✅ Environment variables validated successfully');
}
