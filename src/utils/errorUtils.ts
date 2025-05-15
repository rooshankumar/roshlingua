
/**
 * Utility functions for error handling and debugging
 */

/**
 * Safely stringifies objects even if they contain circular references
 * or objects that cannot be directly converted to primitives
 */
export function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    
    // Handle objects that might cause conversion errors
    try {
      // Test if the value can be converted to a string
      String(value);
      return value;
    } catch (err) {
      return `[Object that cannot be converted to string: ${typeof value}]`;
    }
  }, 2);
}

/**
 * Logs detailed information about an error
 */
export function logDetailedError(error: unknown, componentInfo?: string): void {
  console.group('Detailed Error Information');
  
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Stack trace:', error.stack);
  } else {
    console.error('Non-error object thrown:', safeStringify(error));
  }
  
  if (componentInfo) {
    console.error('Component info:', componentInfo);
  }
  
  console.groupEnd();
}
