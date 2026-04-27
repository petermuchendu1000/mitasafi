/**
 * Reliability Hooks
 *
 * React hooks for reliability features including:
 * - Retry with exponential backoff
 * - Circuit breaker state management
 * - Error handling and recovery
 * - Data persistence and recovery
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  RetryConfig,
  CircuitBreakerConfig,
  CircuitBreakerState,
  SafeResult,
  ErrorCategory,
  ErrorSeverity,
  withRetryAsync,
  createCircuitBreaker,
  classifyError,
  trackError,
  safeExecuteAsync,
  validateAndRecover,
  sanitizeFormData,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from '../reliability-utils';
import { CommercialFormData, CommercialType, CommercialSubtype } from '../commercial-types';

// =============================================================================
// RETRY HOOK
// =============================================================================

interface UseRetryOptions<T> extends Partial<RetryConfig> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number, error: Error) => void;
}

interface UseRetryResult<T> {
  execute: (fn: () => Promise<T>) => Promise<T | null>;
  isLoading: boolean;
  error: Error | null;
  attempt: number;
  reset: () => void;
}

/**
 * Hook for async operations with automatic retry
 */
export function useRetry<T>(options: UseRetryOptions<T> = {}): UseRetryResult<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const config: RetryConfig = {
    maxAttempts: options.maxAttempts ?? DEFAULT_RETRY_CONFIG.maxAttempts,
    delayMs: options.delayMs ?? DEFAULT_RETRY_CONFIG.delayMs,
    exponentialBackoff: options.exponentialBackoff ?? DEFAULT_RETRY_CONFIG.exponentialBackoff,
    maxDelayMs: options.maxDelayMs ?? DEFAULT_RETRY_CONFIG.maxDelayMs,
    onRetry: (attemptNum, err) => {
      setAttempt(attemptNum);
      options.onRetry?.(attemptNum, err);
    },
  };

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<T | null> => {
      setIsLoading(true);
      setError(null);
      setAttempt(0);

      try {
        const result = await withRetryAsync(fn, config);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
        trackError(error, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [config, options]
  );

  const reset = useCallback(() => {
    setError(null);
    setAttempt(0);
    setIsLoading(false);
  }, []);

  return { execute, isLoading, error, attempt, reset };
}

// =============================================================================
// CIRCUIT BREAKER HOOK
// =============================================================================

interface UseCircuitBreakerOptions extends Partial<CircuitBreakerConfig> {
  onStateChange?: (state: CircuitBreakerState) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

interface UseCircuitBreakerResult<T> {
  execute: (fn: () => Promise<T>) => Promise<SafeResult<T>>;
  state: CircuitBreakerState;
  canExecute: boolean;
  failureCount: number;
  reset: () => void;
}

/**
 * Hook for circuit breaker pattern
 */
export function useCircuitBreaker<T>(
  options: UseCircuitBreakerOptions = {}
): UseCircuitBreakerResult<T> {
  const [state, setState] = useState<CircuitBreakerState>(CircuitBreakerState.CLOSED);
  const [failureCount, setFailureCount] = useState(0);
  const prevStateRef = useRef(state);

  const config: CircuitBreakerConfig = {
    failureThreshold: options.failureThreshold ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold,
    resetTimeoutMs: options.resetTimeoutMs ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeoutMs,
    halfOpenRequests: options.halfOpenRequests ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.halfOpenRequests,
  };

  const breakerRef = useRef(createCircuitBreaker(config));

  // Notify on state changes
  useEffect(() => {
    if (prevStateRef.current !== state) {
      options.onStateChange?.(state);
      
      if (state === CircuitBreakerState.OPEN) {
        options.onOpen?.();
      } else if (state === CircuitBreakerState.CLOSED && prevStateRef.current !== CircuitBreakerState.CLOSED) {
        options.onClose?.();
      }
      
      prevStateRef.current = state;
    }
  }, [state, options]);

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<SafeResult<T>> => {
      const breaker = breakerRef.current;
      
      if (!breaker.canExecute()) {
        return {
          success: false,
          error: new Error('Circuit breaker is open - service temporarily unavailable'),
        };
      }

      try {
        const result = await fn();
        breaker.recordSuccess();
        setState(breaker.getState());
        setFailureCount(0);
        return { success: true, data: result };
      } catch (err) {
        breaker.recordFailure();
        setState(breaker.getState());
        setFailureCount((prev) => prev + 1);
        const error = err instanceof Error ? err : new Error(String(err));
        trackError(error, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM);
        return { success: false, error };
      }
    },
    []
  );

  const reset = useCallback(() => {
    breakerRef.current.reset();
    setState(CircuitBreakerState.CLOSED);
    setFailureCount(0);
  }, []);

  return {
    execute,
    state,
    canExecute: state !== CircuitBreakerState.OPEN,
    failureCount,
    reset,
  };
}

// =============================================================================
// SAFE ASYNC HOOK
// =============================================================================

interface UseSafeAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  trackErrors?: boolean;
}

interface UseSafeAsyncResult<T> {
  execute: (fn: () => Promise<T>) => Promise<SafeResult<T>>;
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  reset: () => void;
}

/**
 * Hook for safe async execution with automatic error handling
 */
export function useSafeAsync<T>(options: UseSafeAsyncOptions<T> = {}): UseSafeAsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<SafeResult<T>> => {
      setIsLoading(true);
      setError(null);

      const result = await safeExecuteAsync(fn);

      if (result.success && result.data !== undefined) {
        setData(result.data);
        options.onSuccess?.(result.data);
      } else if (result.error) {
        setError(result.error);
        options.onError?.(result.error);
        
        if (options.trackErrors !== false) {
          const classification = classifyError(result.error);
          trackError(result.error, classification.category, classification.severity);
        }
      }

      setIsLoading(false);
      return result;
    },
    [options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { execute, data, error, isLoading, reset };
}

// =============================================================================
// DATA RECOVERY HOOK
// =============================================================================

interface UseDataRecoveryOptions {
  propertyType: CommercialType | null;
  propertySubtype: CommercialSubtype | null;
  autoSaveKey?: string;
  autoSaveInterval?: number;
}

interface UseDataRecoveryResult {
  recover: (data: CommercialFormData) => CommercialFormData;
  sanitize: (data: CommercialFormData) => CommercialFormData;
  saveToStorage: (data: CommercialFormData) => void;
  loadFromStorage: () => CommercialFormData | null;
  clearStorage: () => void;
  lastRecoveredFields: string[];
  hasRecovery: boolean;
}

/**
 * Hook for data validation and recovery
 */
export function useDataRecovery(options: UseDataRecoveryOptions): UseDataRecoveryResult {
  const [lastRecoveredFields, setLastRecoveredFields] = useState<string[]>([]);
  const [hasRecovery, setHasRecovery] = useState(false);

  const storageKey = options.autoSaveKey || 'listing_draft';

  // Auto-save interval
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  const sanitize = useCallback((data: CommercialFormData): CommercialFormData => {
    return sanitizeFormData(data);
  }, []);

  const recover = useCallback(
    (data: CommercialFormData): CommercialFormData => {
      if (!options.propertyType) {
        return data;
      }

      const sanitized = sanitizeFormData(data);
      const { data: recovered, recoveredFields } = validateAndRecover(
        sanitized,
        options.propertyType,
        options.propertySubtype
      );

      setLastRecoveredFields(recoveredFields);
      setHasRecovery(recoveredFields.length > 0);

      return recovered;
    },
    [options.propertyType, options.propertySubtype]
  );

  const saveToStorage = useCallback(
    (data: CommercialFormData) => {
      try {
        const serialized = JSON.stringify({
          data,
          timestamp: Date.now(),
          propertyType: options.propertyType,
          propertySubtype: options.propertySubtype,
        });
        localStorage.setItem(storageKey, serialized);
      } catch (err) {
        console.warn('Failed to save to storage:', err);
      }
    },
    [storageKey, options.propertyType, options.propertySubtype]
  );

  const loadFromStorage = useCallback((): CommercialFormData | null => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      
      // Check if data is too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > maxAge) {
        localStorage.removeItem(storageKey);
        return null;
      }

      // Recover the loaded data
      return recover(parsed.data);
    } catch (err) {
      console.warn('Failed to load from storage:', err);
      return null;
    }
  }, [storageKey, recover]);

  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.warn('Failed to clear storage:', err);
    }
  }, [storageKey]);

  // Cleanup auto-save on unmount
  useEffect(() => {
    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, []);

  return {
    recover,
    sanitize,
    saveToStorage,
    loadFromStorage,
    clearStorage,
    lastRecoveredFields,
    hasRecovery,
  };
}

// =============================================================================
// GRACEFUL DEGRADATION HOOK
// =============================================================================

interface FallbackOption<T> {
  id: string;
  execute: () => Promise<T>;
  priority?: number;
}

interface UseGracefulDegradationOptions<T> {
  fallbacks: FallbackOption<T>[];
  onFallbackUsed?: (fallbackId: string) => void;
  cacheResult?: boolean;
  cacheDuration?: number;
}

interface UseGracefulDegradationResult<T> {
  execute: () => Promise<T | null>;
  result: T | null;
  usedFallback: string | null;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook for graceful degradation with fallback chain
 */
export function useGracefulDegradation<T>(
  options: UseGracefulDegradationOptions<T>
): UseGracefulDegradationResult<T> {
  const [result, setResult] = useState<T | null>(null);
  const [usedFallback, setUsedFallback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null);

  // Sort fallbacks by priority (lower = higher priority)
  const sortedFallbacks = [...options.fallbacks].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
  );

  const execute = useCallback(async (): Promise<T | null> => {
    // Check cache first
    if (options.cacheResult && cacheRef.current) {
      const cacheAge = Date.now() - cacheRef.current.timestamp;
      const maxAge = options.cacheDuration ?? 5 * 60 * 1000; // 5 minutes default
      
      if (cacheAge < maxAge) {
        return cacheRef.current.data;
      }
    }

    setIsLoading(true);
    setError(null);
    setUsedFallback(null);

    const errors: Error[] = [];

    for (const fallback of sortedFallbacks) {
      try {
        const data = await fallback.execute();
        setResult(data);
        
        if (fallback.priority !== 0) {
          setUsedFallback(fallback.id);
          options.onFallbackUsed?.(fallback.id);
        }

        // Cache result
        if (options.cacheResult) {
          cacheRef.current = { data, timestamp: Date.now() };
        }

        setIsLoading(false);
        return data;
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(String(err)));
      }
    }

    // All fallbacks failed
    const finalError = new Error(
      `All fallback options failed: ${errors.map((e) => e.message).join('; ')}`
    );
    setError(finalError);
    setIsLoading(false);
    trackError(finalError, ErrorCategory.SYSTEM, ErrorSeverity.HIGH);
    
    return null;
  }, [sortedFallbacks, options]);

  const reset = useCallback(() => {
    setResult(null);
    setUsedFallback(null);
    setError(null);
    setIsLoading(false);
    cacheRef.current = null;
  }, []);

  return {
    execute,
    result,
    usedFallback,
    isLoading,
    error,
    reset,
  };
}

// =============================================================================
// ONLINE STATUS HOOK
// =============================================================================

interface UseOnlineStatusResult {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
}

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus(): UseOnlineStatusResult {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasOffline, lastOnlineAt };
}

// =============================================================================
// OPERATION QUEUE HOOK (for offline support)
// =============================================================================

interface QueuedOperation<T> {
  id: string;
  operation: () => Promise<T>;
  timestamp: number;
  retries: number;
}

interface UseOperationQueueOptions {
  maxRetries?: number;
  processWhenOnline?: boolean;
  storageKey?: string;
}

interface UseOperationQueueResult<T> {
  enqueue: (operation: () => Promise<T>) => string;
  process: () => Promise<void>;
  queue: QueuedOperation<T>[];
  processing: boolean;
  results: Map<string, SafeResult<T>>;
  clear: () => void;
}

/**
 * Hook for queuing operations (especially useful for offline support)
 */
export function useOperationQueue<T>(
  options: UseOperationQueueOptions = {}
): UseOperationQueueResult<T> {
  const [queue, setQueue] = useState<QueuedOperation<T>[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<Map<string, SafeResult<T>>>(new Map());
  const { isOnline } = useOnlineStatus();

  const maxRetries = options.maxRetries ?? 3;

  const enqueue = useCallback((operation: () => Promise<T>): string => {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedOp: QueuedOperation<T> = {
      id,
      operation,
      timestamp: Date.now(),
      retries: 0,
    };

    setQueue((prev) => [...prev, queuedOp]);
    return id;
  }, []);

  const process = useCallback(async (): Promise<void> => {
    if (processing || queue.length === 0) return;

    setProcessing(true);
    const newResults = new Map(results);
    const remainingQueue: QueuedOperation<T>[] = [];

    for (const item of queue) {
      try {
        const result = await item.operation();
        newResults.set(item.id, { success: true, data: result });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        if (item.retries < maxRetries) {
          remainingQueue.push({ ...item, retries: item.retries + 1 });
        } else {
          newResults.set(item.id, { success: false, error });
        }
      }
    }

    setResults(newResults);
    setQueue(remainingQueue);
    setProcessing(false);
  }, [processing, queue, results, maxRetries]);

  // Auto-process when coming back online
  useEffect(() => {
    if (isOnline && options.processWhenOnline !== false && queue.length > 0) {
      process();
    }
  }, [isOnline, options.processWhenOnline, queue.length, process]);

  const clear = useCallback(() => {
    setQueue([]);
    setResults(new Map());
  }, []);

  return { enqueue, process, queue, processing, results, clear };
}

// =============================================================================
// COMBINED RELIABLE FETCH HOOK
// =============================================================================

interface UseReliableFetchOptions<T> {
  retryConfig?: Partial<RetryConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  fallbackData?: T;
  cacheKey?: string;
  cacheDuration?: number;
}

interface UseReliableFetchResult<T> {
  execute: (url: string, init?: RequestInit) => Promise<T | null>;
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  circuitState: CircuitBreakerState;
  reset: () => void;
}

/**
 * Combined hook for reliable data fetching with retry, circuit breaker, and caching
 */
export function useReliableFetch<T>(
  options: UseReliableFetchOptions<T> = {}
): UseReliableFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { execute: retryExecute } = useRetry<T>({
    ...options.retryConfig,
  });

  const { execute: breakerExecute, state: circuitState } = useCircuitBreaker<T>(
    options.circuitBreakerConfig
  );

  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const execute = useCallback(
    async (url: string, init?: RequestInit): Promise<T | null> => {
      const cacheKey = options.cacheKey || url;

      // Check cache
      if (options.cacheDuration) {
        const cached = cacheRef.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < options.cacheDuration) {
          setData(cached.data);
          return cached.data;
        }
      }

      setIsLoading(true);
      setError(null);

      // First, try with circuit breaker
      const breakerResult = await breakerExecute(async () => {
        // Then with retry
        const result = await retryExecute(async () => {
          const response = await fetch(url, init);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json() as Promise<T>;
        });

        if (result === null) {
          throw new Error('Request failed after retries');
        }
        return result;
      });

      setIsLoading(false);

      if (breakerResult.success && breakerResult.data) {
        setData(breakerResult.data);
        
        // Update cache
        if (options.cacheDuration) {
          cacheRef.current.set(cacheKey, {
            data: breakerResult.data,
            timestamp: Date.now(),
          });
        }
        
        return breakerResult.data;
      }

      // Try fallback
      if (options.fallbackData) {
        setData(options.fallbackData);
        return options.fallbackData;
      }

      setError(breakerResult.error || new Error('Unknown error'));
      return null;
    },
    [retryExecute, breakerExecute, options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    execute,
    data,
    error,
    isLoading,
    circuitState,
    reset,
  };
}
