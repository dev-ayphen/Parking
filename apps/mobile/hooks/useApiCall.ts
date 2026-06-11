/**
 * Custom Hook for API Calls
 * Manages loading, error states and provides error type detection
 */

import { useCallback, useState } from 'react';
import { ApiError, apiCall, apiCallWithRetry } from '../services/api.service';

export interface UseApiCallOptions {
  withRetry?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
}

export function useApiCall(options: UseApiCallOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const execute = useCallback(
    async <T = any>(
      url: string,
      fetchOptions?: RequestInit
    ): Promise<T | null> => {
      setLoading(true);
      setError('');

      try {
        const data = options.withRetry
          ? await apiCallWithRetry<T>(url, fetchOptions)
          : await apiCall<T>(url, fetchOptions);

        setLoading(false);
        options.onSuccess?.(data);
        return data;
      } catch (err) {
        const apiError = err as ApiError;
        setLoading(false);
        setError(apiError.message);
        options.onError?.(apiError);
        return null;
      }
    },
    [options]
  );

  const clearError = useCallback(() => setError(''), []);

  return {
    execute,
    loading,
    error,
    clearError,
    isTimeout: error.includes('timeout'),
    isNetworkError: error.includes('network') || error.includes('connect'),
  };
}
