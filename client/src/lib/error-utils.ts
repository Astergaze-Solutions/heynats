import { ApiError } from './api';

/**
 * Formats error messages for display in toast notifications
 * Extracts detailed information from various error types
 */
export function formatErrorMessage(error: unknown, fallbackMessage: string = 'An unexpected error occurred'): string {
  if (error instanceof ApiError) {
    let message = error.message;
    
    // Add status code if available
    if (error.status) {
      message = `HTTP ${error.status}: ${message}`;
    }
    
    // Add details if available
    if (error.details) {
      message += `\n\nDetails: ${error.details}`;
    }
    
    return message;
  }
  
  if (error instanceof Error) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return `Network Error: Unable to connect to server\n\nDetails: ${error.message}`;
    }
    
    // Handle timeout errors
    if (error.message.includes('timeout')) {
      return `Timeout Error: Request took too long\n\nDetails: ${error.message}`;
    }
    
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  // For network errors or other types
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    
    // Check for validation errors
    if (errorObj.validation_errors || errorObj.validationErrors) {
      const validationErrors = errorObj.validation_errors || errorObj.validationErrors;
      let message = 'Validation Error:\n\n';
      
      if (Array.isArray(validationErrors)) {
        message += validationErrors.map((err: any) => `• ${err.field || 'Unknown field'}: ${err.message || err}`).join('\n');
      } else if (typeof validationErrors === 'object') {
        message += Object.entries(validationErrors).map(([field, msg]) => `• ${field}: ${msg}`).join('\n');
      } else {
        message += validationErrors.toString();
      }
      
      return message;
    }
    
    // Check for common error properties
    if (errorObj.message) {
      let message = errorObj.message;
      
      // Add error code if available
      if (errorObj.code) {
        message = `[${errorObj.code}] ${message}`;
      }
      
      // Add additional context
      if (errorObj.context || errorObj.details) {
        message += `\n\nDetails: ${errorObj.context || errorObj.details}`;
      }
      
      return message;
    }
    
    if (errorObj.error) {
      return errorObj.error;
    }
    
    // Handle response errors
    if (errorObj.response) {
      const response = errorObj.response;
      return `Response Error: ${response.status} ${response.statusText}\n\nURL: ${response.url}`;
    }
    
    // Try to stringify the object for debugging
    try {
      const stringified = JSON.stringify(errorObj, null, 2);
      if (stringified && stringified !== '{}') {
        return `Debug Info:\n\n${stringified}`;
      }
    } catch {
      // JSON.stringify failed, continue to fallback
    }
  }
  
  return fallbackMessage;
}

/**
 * Gets a detailed error title based on the error context
 */
export function getErrorTitle(action: string, error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return `Invalid ${action} Request`;
      case 401:
        return `Authentication Failed`;
      case 403:
        return `Permission Denied`;
      case 404:
        return `Resource Not Found`;
      case 409:
        return `Conflict - Resource Already Exists`;
      case 422:
        return `Validation Failed`;
      case 500:
        return `Internal Server Error`;
      case 502:
        return `Bad Gateway`;
      case 503:
        return `Service Unavailable`;
      case 504:
        return `Gateway Timeout`;
      default:
        return `Failed to ${action} (${error.status})`;
    }
  }
  
  if (error instanceof Error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return `Network Connection Error`;
    }
    
    if (error.message.includes('timeout')) {
      return `Request Timeout`;
    }
    
    if (error.name) {
      return `${error.name} - Failed to ${action}`;
    }
  }
  
  return `Failed to ${action}`;
}

/**
 * Shows a detailed error toast with proper formatting
 */
export function showErrorToast(action: string, error: unknown, fallbackMessage?: string) {
  // Dynamic import to avoid circular dependencies
  import('sonner').then(({ toast }) => {
    const title = getErrorTitle(action, error);
    const message = formatErrorMessage(error, fallbackMessage);
    
    toast.error(title, {
      description: message,
      duration: 8000,
      closeButton: true,
    });
  }).catch(() => {
    // Fallback to console if toast import fails
    console.error(`${action} failed:`, error);
  });
}

/**
 * Shows a success toast with consistent formatting
 */
export function showSuccessToast(message: string, description?: string) {
  import('sonner').then(({ toast }) => {
    toast.success(message, {
      description,
      duration: 4000,
    });
  }).catch(() => {
    console.log(`Success: ${message}`, description);
  });
}