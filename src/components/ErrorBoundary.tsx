
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error, 
      errorInfo: null 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Update state with error info
    this.setState({
      errorInfo
    });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <div className="p-6 rounded-md bg-destructive/10 border border-destructive/20 m-4 shadow-md">
          <h2 className="text-xl font-semibold text-destructive mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">
            The application encountered an error. You can try refreshing the page.
          </p>
          <details className="mt-2 text-sm text-destructive/80">
            <summary className="cursor-pointer font-medium">Show error details</summary>
            <div className="mt-2 p-2 bg-black/5 rounded overflow-auto">
              <p className="font-mono text-xs whitespace-pre-wrap mb-2">
                {this.state.error?.toString()}
              </p>
              {this.state.errorInfo && (
                <div className="mt-2 border-t border-destructive/20 pt-2">
                  <p className="font-medium mb-1 text-xs">Component Stack:</p>
                  <pre className="font-mono text-xs whitespace-pre-wrap overflow-auto max-h-[200px]">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
