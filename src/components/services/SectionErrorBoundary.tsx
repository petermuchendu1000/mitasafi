/**
 * Section Error Boundary
 * 
 * Lightweight error boundary for isolating failures in individual
 * sections of the services page. If one section throws (e.g., 
 * FeaturedProviders), the rest of the page continues to render.
 * 
 * Usage:
 *   <SectionErrorBoundary name="Featured Providers">
 *     <FeaturedProviders providers={data} />
 *   </SectionErrorBoundary>
 */

"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface Props {
  /** Human-readable section name for error messages */
  name: string;
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
  /** Additional className for the error container */
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[SectionErrorBoundary] "${this.props.name}" failed:`,
      error,
      errorInfo.componentStack
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={cn(
            "rounded-xl border border-gray-200 bg-gray-50 p-6 text-center",
            this.props.className
          )}
          role="alert"
        >
          <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">
            Couldn&apos;t load {this.props.name}
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Something went wrong. The rest of the page is still available.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 bg-white border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
