/**
 * Error Boundary Components
 *
 * React error boundaries for graceful error handling in wizard steps.
 * Implements the error boundary pattern to prevent cascading failures.
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  classifyError,
  trackError,
  ErrorCategory,
  ErrorSeverity,
} from '../reliability-utils';

// =============================================================================
// ERROR BOUNDARY FALLBACK COMPONENTS
// =============================================================================

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  componentName?: string;
}

/**
 * Default error fallback for wizard steps
 */
export function StepErrorFallback({ error, resetError, componentName }: ErrorFallbackProps) {
  const classification = classifyError(error);

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-800">
            {componentName ? `Error in ${componentName}` : 'Something went wrong'}
          </h3>
          <p className="mt-2 text-sm text-red-700">
            {classification.recoverable
              ? 'An error occurred, but you can try again.'
              : 'An unexpected error occurred. Please refresh the page.'}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-red-600">
                Technical Details
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-red-100 p-3 text-xs text-red-800">
                {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
            </details>
          )}
          <div className="mt-4 flex gap-3">
            <button
              onClick={resetError}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Minimal error fallback for smaller components
 */
export function MinimalErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-4 text-center">
      <p className="text-sm text-red-600">Failed to load this section</p>
      <button
        onClick={resetError}
        className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * Full-page error fallback
 */
export function PageErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <div className="text-center">
        <svg
          className="mx-auto h-16 w-16 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          Oops! Something went wrong
        </h2>
        <p className="mt-2 text-gray-600">
          We encountered an unexpected error. Please try again.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={resetError}
            className="rounded-md bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ERROR BOUNDARY CLASS COMPONENT
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Generic Error Boundary Component
 * 
 * Catches errors in child component tree and displays fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Track the error
    const classification = classifyError(error);
    trackError(error, classification.category, classification.severity);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state if resetKeys have changed
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      !this.areKeysEqual(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.setState({ hasError: false, error: null });
    }
  }

  private areKeysEqual(prev: unknown[], next: unknown[]): boolean {
    if (prev.length !== next.length) return false;
    return prev.every((key, index) => key === next[index]);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const fallbackProps: ErrorFallbackProps = {
        error: this.state.error,
        resetError: this.resetError,
        componentName: this.props.componentName,
      };

      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(fallbackProps);
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <StepErrorFallback {...fallbackProps} />;
    }

    return this.props.children;
  }
}

// =============================================================================
// SPECIALIZED ERROR BOUNDARIES
// =============================================================================

interface WizardStepErrorBoundaryProps {
  children: ReactNode;
  stepName: string;
  onError?: (error: Error, stepName: string) => void;
  resetKeys?: unknown[];
}

/**
 * Error Boundary specialized for wizard steps
 */
export function WizardStepErrorBoundary({
  children,
  stepName,
  onError,
  resetKeys,
}: WizardStepErrorBoundaryProps) {
  return (
    <ErrorBoundary
      componentName={stepName}
      onError={(error, info) => {
        if (onError) {
          onError(error, stepName);
        }
      }}
      resetKeys={resetKeys}
      fallback={(props) => (
        <StepErrorFallback {...props} componentName={stepName} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

interface FormSectionErrorBoundaryProps {
  children: ReactNode;
  sectionName?: string;
  minimal?: boolean;
}

/**
 * Error Boundary for individual form sections
 */
export function FormSectionErrorBoundary({
  children,
  sectionName,
  minimal = false,
}: FormSectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      componentName={sectionName}
      fallback={(props) =>
        minimal ? (
          <MinimalErrorFallback {...props} />
        ) : (
          <StepErrorFallback {...props} componentName={sectionName} />
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}

interface AsyncBoundaryProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
}

/**
 * Combined Error Boundary with Suspense for async operations
 */
export function AsyncBoundary({
  children,
  loadingFallback,
  errorFallback,
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <React.Suspense
        fallback={
          loadingFallback || (
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            </div>
          )
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

// =============================================================================
// ERROR BOUNDARY HOOKS (for functional component integration)
// =============================================================================

/**
 * Hook to programmatically throw an error to the nearest error boundary
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}

/**
 * Hook to track errors without throwing
 */
export function useErrorTracking() {
  const trackErrorCallback = React.useCallback(
    (error: Error, category?: ErrorCategory, severity?: ErrorSeverity) => {
      const classification = classifyError(error);
      trackError(
        error,
        category || classification.category,
        severity || classification.severity
      );
    },
    []
  );

  return { trackError: trackErrorCallback };
}
