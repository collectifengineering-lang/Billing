/**
 * Input Validation Utilities
 * Provides validation functions for API route inputs
 */

import { createErrorResponse, ErrorType } from './api-errors';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date string format (YYYY-MM-DD or ISO format)
 */
export function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate required string field
 */
export function validateRequiredString(value: unknown, fieldName: string): ValidationResult {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {
      valid: false,
      errors: [`${fieldName} is required and must be a non-empty string`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate optional string field
 */
export function validateOptionalString(value: unknown, fieldName: string): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: true, errors: [] };
  }
  if (typeof value !== 'string') {
    return {
      valid: false,
      errors: [`${fieldName} must be a string if provided`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate required number field
 */
export function validateRequiredNumber(value: unknown, fieldName: string): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      errors: [`${fieldName} is required and must be a valid number`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate optional number field
 */
export function validateOptionalNumber(value: unknown, fieldName: string): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: true, errors: [] };
  }
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      errors: [`${fieldName} must be a number if provided`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate required boolean field
 */
export function validateRequiredBoolean(value: unknown, fieldName: string): ValidationResult {
  if (typeof value !== 'boolean') {
    return {
      valid: false,
      errors: [`${fieldName} is required and must be a boolean`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string
): ValidationResult {
  if (value.length < minLength) {
    return {
      valid: false,
      errors: [`${fieldName} must be at least ${minLength} characters long`],
    };
  }
  if (value.length > maxLength) {
    return {
      valid: false,
      errors: [`${fieldName} must be at most ${maxLength} characters long`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate number range
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  if (value < min || value > max) {
    return {
      valid: false,
      errors: [`${fieldName} must be between ${min} and ${max}`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate array field
 */
export function validateRequiredArray(value: unknown, fieldName: string): ValidationResult {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      errors: [`${fieldName} is required and must be an array`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate object field
 */
export function validateRequiredObject(value: unknown, fieldName: string): ValidationResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {
      valid: false,
      errors: [`${fieldName} is required and must be an object`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: string, endDate: string): ValidationResult {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime())) {
    return {
      valid: false,
      errors: ['Start date is invalid'],
    };
  }
  
  if (isNaN(end.getTime())) {
    return {
      valid: false,
      errors: ['End date is invalid'],
    };
  }
  
  if (start > end) {
    return {
      valid: false,
      errors: ['Start date must be before end date'],
    };
  }
  
  return { valid: true, errors: [] };
}

/**
 * Validate UUID format
 */
export function validateUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(result => result.errors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Validate request body
 */
export async function validateRequestBody<T>(
  request: Request,
  validator: (body: unknown) => ValidationResult
): Promise<{ valid: true; data: T } | { valid: false; error: Response }> {
  try {
    const body = await request.json();
    const validation = validator(body);
    
    if (!validation.valid) {
      return {
        valid: false,
        error: createErrorResponse(
          new Error('Validation failed'),
          {
            statusCode: 400,
            customMessage: 'Invalid request body',
            customSuggestions: validation.errors,
          }
        ),
      };
    }
    
    return {
      valid: true,
      data: body as T,
    };
  } catch (error) {
    return {
      valid: false,
      error: createErrorResponse(
        error instanceof Error ? error : new Error('Invalid JSON'),
        {
          statusCode: 400,
          customMessage: 'Invalid request body format',
        }
      ),
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams(
  searchParams: URLSearchParams,
  validators: Record<string, (value: string) => ValidationResult>
): ValidationResult {
  const errors: string[] = [];
  
  for (const [key, validator] of Object.entries(validators)) {
    const value = searchParams.get(key);
    if (value !== null) {
      const result = validator(value);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    } else if (key.startsWith('required_')) {
      errors.push(`${key.replace('required_', '')} is required`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Common validators
 */
export const validators = {
  email: (value: string, fieldName = 'email'): ValidationResult => {
    if (!validateEmail(value)) {
      return {
        valid: false,
        errors: [`${fieldName} must be a valid email address`],
      };
    }
    return { valid: true, errors: [] };
  },
  
  url: (value: string, fieldName = 'url'): ValidationResult => {
    if (!validateUrl(value)) {
      return {
        valid: false,
        errors: [`${fieldName} must be a valid URL`],
      };
    }
    return { valid: true, errors: [] };
  },
  
  date: (value: string, fieldName = 'date'): ValidationResult => {
    if (!validateDate(value)) {
      return {
        valid: false,
        errors: [`${fieldName} must be a valid date`],
      };
    }
    return { valid: true, errors: [] };
  },
  
  uuid: (value: string, fieldName = 'id'): ValidationResult => {
    if (!validateUuid(value)) {
      return {
        valid: false,
        errors: [`${fieldName} must be a valid UUID`],
      };
    }
    return { valid: true, errors: [] };
  },
  
  positiveNumber: (value: number, fieldName: string): ValidationResult => {
    if (value <= 0) {
      return {
        valid: false,
        errors: [`${fieldName} must be a positive number`],
      };
    }
    return { valid: true, errors: [] };
  },
  
  nonNegativeNumber: (value: number, fieldName: string): ValidationResult => {
    if (value < 0) {
      return {
        valid: false,
        errors: [`${fieldName} must be a non-negative number`],
      };
    }
    return { valid: true, errors: [] };
  },
};
