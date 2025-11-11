/**
 * Standardized API Error Handling Utilities
 * Provides consistent error response format and type-safe error handling
 */

import { NextResponse } from 'next/server';

/**
 * Standard API Error Response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: string;
  code?: string;
  timestamp: string;
  suggestions?: string[];
  retryAfter?: string;
}

/**
 * Standard API Success Response
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  count?: number;
  timestamp: string;
  warnings?: string[];
}

/**
 * API Response type
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Error types for different scenarios
 */
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
}

/**
 * Type guard for axios errors
 */
export interface AxiosErrorResponse {
  response?: {
    status?: number;
    statusText?: string;
    data?: unknown;
    headers?: Record<string, string>;
  };
  message?: string;
  code?: string;
}

export function isAxiosError(error: unknown): error is AxiosErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  );
}

/**
 * Type guard for Prisma errors
 */
export interface PrismaError {
  code?: string;
  meta?: Record<string, unknown>;
  message?: string;
}

export function isPrismaError(error: unknown): error is PrismaError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'meta' in error)
  );
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (isAxiosError(error)) {
    return error.message || 'External API request failed';
  }
  if (isPrismaError(error)) {
    return error.message || 'Database operation failed';
  }
  return 'An unknown error occurred';
}

/**
 * Extract error code from various error types
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isAxiosError(error)) {
    return error.code;
  }
  if (isPrismaError(error)) {
    return error.code;
  }
  if (error instanceof Error && 'code' in error) {
    return (error as Error & { code: string }).code;
  }
  return undefined;
}

/**
 * Determine error type from error object
 */
export function getErrorType(error: unknown, statusCode?: number): ErrorType {
  // Check status code first
  if (statusCode === 401) return ErrorType.AUTHENTICATION;
  if (statusCode === 403) return ErrorType.AUTHORIZATION;
  if (statusCode === 404) return ErrorType.NOT_FOUND;
  if (statusCode === 429) return ErrorType.RATE_LIMIT;
  if (statusCode === 408 || statusCode === 504) return ErrorType.TIMEOUT;

  // Check error message for patterns
  const message = getErrorMessage(error).toLowerCase();
  
  if (message.includes('authentication') || message.includes('token') || message.includes('unauthorized')) {
    return ErrorType.AUTHENTICATION;
  }
  if (message.includes('forbidden') || message.includes('permission')) {
    return ErrorType.AUTHORIZATION;
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return ErrorType.RATE_LIMIT;
  }
  if (message.includes('not found') || message.includes('404')) {
    return ErrorType.NOT_FOUND;
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorType.TIMEOUT;
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorType.VALIDATION;
  }

  // Check for Prisma errors
  if (isPrismaError(error)) {
    return ErrorType.DATABASE;
  }

  // Check for axios errors
  if (isAxiosError(error)) {
    return ErrorType.EXTERNAL_API;
  }

  return ErrorType.INTERNAL;
}

/**
 * Get HTTP status code for error type
 */
export function getStatusCodeForErrorType(errorType: ErrorType): number {
  switch (errorType) {
    case ErrorType.AUTHENTICATION:
      return 401;
    case ErrorType.AUTHORIZATION:
      return 403;
    case ErrorType.VALIDATION:
      return 400;
    case ErrorType.NOT_FOUND:
      return 404;
    case ErrorType.RATE_LIMIT:
      return 429;
    case ErrorType.DATABASE:
      return 500;
    case ErrorType.EXTERNAL_API:
      return 502;
    case ErrorType.TIMEOUT:
      return 408;
    case ErrorType.INTERNAL:
    default:
      return 500;
  }
}

/**
 * Get suggestions for error type
 */
export function getErrorSuggestions(errorType: ErrorType, error?: unknown): string[] {
  const suggestions: string[] = [];

  switch (errorType) {
    case ErrorType.AUTHENTICATION:
      suggestions.push('Verify authentication credentials');
      suggestions.push('Check environment variables');
      suggestions.push('Refresh authentication tokens');
      break;
    case ErrorType.AUTHORIZATION:
      suggestions.push('Check user permissions');
      suggestions.push('Verify admin access configuration');
      break;
    case ErrorType.VALIDATION:
      suggestions.push('Check input parameters');
      suggestions.push('Verify data format');
      break;
    case ErrorType.NOT_FOUND:
      suggestions.push('Verify resource exists');
      suggestions.push('Check resource ID');
      break;
    case ErrorType.RATE_LIMIT:
      suggestions.push('Wait a few minutes before retrying');
      suggestions.push('Check API usage limits');
      suggestions.push('Consider implementing request caching');
      break;
    case ErrorType.DATABASE:
      suggestions.push('Check database connection');
      suggestions.push('Verify database credentials');
      suggestions.push('Check Vercel logs for detailed error information');
      break;
    case ErrorType.EXTERNAL_API:
      suggestions.push('Check external API status');
      suggestions.push('Verify API credentials');
      suggestions.push('Check API rate limits');
      break;
    case ErrorType.TIMEOUT:
      suggestions.push('Request took too long to complete');
      suggestions.push('Try again with a smaller data set');
      suggestions.push('Check network connectivity');
      break;
    case ErrorType.INTERNAL:
    default:
      suggestions.push('Check Vercel logs for detailed error information');
      suggestions.push('Verify configuration');
      suggestions.push('Contact support if the issue persists');
      break;
  }

  return suggestions;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: unknown,
  options?: {
    statusCode?: number;
    customMessage?: string;
    customSuggestions?: string[];
    retryAfter?: string;
  }
): NextResponse<ApiErrorResponse> {
  const errorType = getErrorType(error, options?.statusCode);
  const statusCode = options?.statusCode || getStatusCodeForErrorType(errorType);
  const message = options?.customMessage || getErrorMessage(error);
  const code = getErrorCode(error);
  const suggestions = options?.customSuggestions || getErrorSuggestions(errorType, error);

  const errorResponse: ApiErrorResponse = {
    success: false,
    error: errorType,
    message,
    details: error instanceof Error ? error.message : undefined,
    code,
    timestamp: new Date().toISOString(),
    suggestions,
    ...(options?.retryAfter && { retryAfter: options.retryAfter }),
  };

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  options?: {
    count?: number;
    warnings?: string[];
  }
): NextResponse<ApiSuccessResponse<T>> {
  const successResponse: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(options?.count !== undefined && { count: options.count }),
    timestamp: new Date().toISOString(),
    ...(options?.warnings && options.warnings.length > 0 && { warnings: options.warnings }),
  };

  return NextResponse.json(successResponse);
}

/**
 * Handle API route errors consistently
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  // Log error for debugging (in production, use proper logging service)
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error);
  }

  return createErrorResponse(error);
}
