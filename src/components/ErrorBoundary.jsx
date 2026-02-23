import React from 'react';

/**
 * Generic React Error Boundary.
 * Wrap any subtree (e.g. Hero3D, the whole App) so that a render-time
 * crash shows a friendly fallback instead of a white screen.
 *
 * Usage:
 *   <ErrorBoundary fallback={<p>Something went wrong.</p>}>
 *     <ComponentThatMightCrash />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <p className="text-lg font-bold text-red-500 mb-2">Something went wrong.</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Try refreshing the page. If the problem persists, please contact the site owner.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
