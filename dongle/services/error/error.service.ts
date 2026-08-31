/**
 * Error handling service for standardized error responses across API routes
 */

export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    requestId?: string;
  };
}

export interface StandardSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export type APIResponse<T> = StandardSuccessResponse<T> | StandardErrorResponse;

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INVALID_REQUEST = 'INVALID_REQUEST',
}

export class APIError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message: string,
    public requestId?: string,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  statusCode: number,
  requestId?: string,
): StandardErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T): StandardSuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle errors in API routes with consistent logging and response format
 */
export async function handleApiError(
  error: unknown,
  requestId?: string,
): Promise<{
  statusCode: number;
  response: StandardErrorResponse;
}> {
  // Log the error
  console.error('[API Error]', {
    requestId,
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : error,
  });

  // Handle APIError instances
  if (error instanceof APIError) {
    return {
      statusCode: error.statusCode,
      response: createErrorResponse(
        error.code,
        error.message,
        error.statusCode,
        requestId || error.requestId,
      ),
    };
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('not found')) {
      return {
        statusCode: 404,
        response: createErrorResponse(
          ErrorCode.NOT_FOUND,
          error.message,
          404,
          requestId,
        ),
      };
    }

    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return {
        statusCode: 401,
        response: createErrorResponse(
          ErrorCode.AUTHENTICATION_ERROR,
          'Authentication required',
          401,
          requestId,
        ),
      };
    }

    if (error.message.includes('forbidden') || error.message.includes('permission')) {
      return {
        statusCode: 403,
        response: createErrorResponse(
          ErrorCode.AUTHORIZATION_ERROR,
          'Permission denied',
          403,
          requestId,
        ),
      };
    }
  }

  // Default to internal server error
  return {
    statusCode: 500,
    response: createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      requestId,
    ),
  };
}

/**
 * Wrap an API handler with error handling
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<Response>,
) {
  return async (...args: T): Promise<Response> => {
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      return await handler(...args);
    } catch (error) {
      const { statusCode, response } = await handleApiError(error, requestId);
      return new Response(JSON.stringify(response), {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
      });
    }
  };
}
