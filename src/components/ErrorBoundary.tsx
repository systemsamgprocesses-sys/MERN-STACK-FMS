import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Wifi, Server, Database } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  isReporting: boolean;
}

interface ErrorReport {
  errorId: string;
  message: string;
  stack: string;
  componentStack: string;
  userAgent: string;
  url: string;
  timestamp: string;
  userId?: string;
  userRole?: string;
  sessionId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'validation' | 'server' | 'client' | 'authentication' | 'authorization' | 'unknown';
  retryable: boolean;
  metadata: Record<string, any>;
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ErrorBoundary.generateErrorId(),
      isReporting: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.generateErrorId()
    };
  }

  private static generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Categorize and report error
    this.categorizeAndReportError(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private categorizeError(error: Error): { category: string; severity: string; retryable: boolean } {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Network errors
    if (message.includes('fetch') || message.includes('network') || message.includes('connection') || 
        message.includes('cors') || message.includes('timeout') || stack.includes('err_network')) {
      return {
        category: 'network',
        severity: 'medium',
        retryable: true
      };
    }

    // Server errors
    if (message.includes('500') || message.includes('502') || message.includes('503') || 
        message.includes('server error') || stack.includes('internal server error')) {
      return {
        category: 'server',
        severity: 'high',
        retryable: true
      };
    }

    // Authentication errors
    if (message.includes('401') || message.includes('unauthorized') || message.includes('token')) {
      return {
        category: 'authentication',
        severity: 'high',
        retryable: false
      };
    }

    // Authorization errors
    if (message.includes('403') || message.includes('forbidden') || message.includes('permission')) {
      return {
        category: 'authorization',
        severity: 'medium',
        retryable: false
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return {
        category: 'validation',
        severity: 'low',
        retryable: false
      };
    }

    // Connection refused
    if (message.includes('connection refused') || message.includes('err_connection_refused')) {
      return {
        category: 'network',
        severity: 'high',
        retryable: true
      };
    }

    // API endpoint failures
    if (message.includes('api') || message.includes('endpoint') || stack.includes('api call')) {
      return {
        category: 'network',
        severity: 'medium',
        retryable: true
      };
    }

    // Database validation failures
    if (message.includes('database') || message.includes('query') || stack.includes('sql')) {
      return {
        category: 'server',
        severity: 'high',
        retryable: true
      };
    }

    return {
      category: 'unknown',
      severity: 'medium',
      retryable: false
    };
  }

  private async categorizeAndReportError(error: Error, errorInfo: ErrorInfo) {
    const { category, severity, retryable } = this.categorizeError(error);
    
    // Create error report
    const errorReport: ErrorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack || 'No stack trace',
      componentStack: errorInfo.componentStack || 'No component stack',
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userId: this.getUserId(),
      userRole: this.getUserRole(),
      sessionId: this.getSessionId(),
      severity: severity as 'low' | 'medium' | 'high' | 'critical',
      category: category as 'network' | 'validation' | 'server' | 'client' | 'authentication' | 'authorization' | 'unknown',
      retryable,
      metadata: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        onlineStatus: navigator.onLine,
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null,
        performance: {
          timing: performance.timing,
          navigation: performance.navigation
        },
        error: error // Include the actual error for Sentry
      }
    };

    // Store error locally for debugging
    this.storeErrorLocally(errorReport);

    // Send to error reporting service
    await this.reportError(errorReport);

    // Show user-friendly notification for critical errors
    if (severity === 'critical') {
      this.showCriticalErrorNotification(errorReport);
    }
  }

  private getUserId(): string | undefined {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Decode JWT token to get user ID (basic implementation)
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload.userId;
      }
    } catch (error) {
      console.warn('Could not extract user ID from token:', error);
    }
    return undefined;
  }

  private getUserRole(): string | undefined {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role;
      }
    } catch (error) {
      console.warn('Could not extract user role from token:', error);
    }
    return undefined;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private storeErrorLocally(errorReport: ErrorReport) {
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorReports') || '[]');
      existingErrors.push(errorReport);
      
      // Keep only last 50 errors
      if (existingErrors.length > 50) {
        existingErrors.splice(0, existingErrors.length - 50);
      }
      
      localStorage.setItem('errorReports', JSON.stringify(existingErrors));
    } catch (error) {
      console.warn('Could not store error locally:', error);
    }
  }

  private async reportError(errorReport: ErrorReport) {
    try {
      this.setState({ isReporting: true });
      
      // Send to backend error logging service
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(errorReport)
      });

      if (!response.ok) {
        throw new Error(`Failed to report error: ${response.status}`);
      }

      console.log(`Error reported successfully: ${errorReport.errorId}`);
      
      // Send to analytics service if available
      if ((window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: errorReport.message,
          fatal: errorReport.severity === 'critical',
          error_id: errorReport.errorId
        });
      }

      // Send to monitoring service (Sentry, LogRocket, etc.)
      if ((window as any).Sentry) {
        const errorForSentry = errorReport.metadata?.error || this.state.error || new Error(errorReport.message);
        (window as any).Sentry.captureException(errorForSentry, {
          tags: {
            category: errorReport.category,
            severity: errorReport.severity,
            userId: errorReport.userId,
            userRole: errorReport.userRole
          },
          extra: errorReport.metadata
        });
      }

    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    } finally {
      this.setState({ isReporting: false });
    }
  }

  private showCriticalErrorNotification(errorReport: ErrorReport) {
    // Create and show critical error notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg max-w-sm';
    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium">Critical Error Detected</p>
          <p class="text-xs mt-1">Error ID: ${errorReport.errorId}</p>
          <p class="text-xs mt-1">Our team has been notified and is working on a fix.</p>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ErrorBoundary.generateErrorId()
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private getCategoryIcon(category: string) {
    switch (category) {
      case 'network':
        return <Wifi className="h-6 w-6" />;
      case 'server':
        return <Server className="h-6 w-6" />;
      case 'database':
        return <Database className="h-6 w-6" />;
      default:
        return <Bug className="h-6 w-6" />;
    }
  }

  private getCategoryColor(category: string): string {
    switch (category) {
      case 'network':
        return 'text-orange-600 bg-orange-100';
      case 'server':
        return 'text-red-600 bg-red-100';
      case 'database':
        return 'text-purple-600 bg-purple-100';
      case 'authentication':
        return 'text-blue-600 bg-blue-100';
      case 'authorization':
        return 'text-indigo-600 bg-indigo-100';
      case 'validation':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  private getRetrySuggestion(category: string): string {
    switch (category) {
      case 'network':
        return 'Check your internet connection and try again.';
      case 'server':
        return 'The server might be temporarily unavailable. Try again in a moment.';
      case 'database':
        return 'Database connection issue. Please try again.';
      case 'authentication':
        return 'Please log out and log back in.';
      default:
        return 'Try refreshing the page or contact support if the problem persists.';
    }
  }

  private getErrorDetails() {
    if (!this.state.error || !this.state.errorInfo) return null;

    const { category, severity, retryable } = this.categorizeError(this.state.error);
    
    return {
      category,
      severity,
      retryable,
      suggestion: this.getRetrySuggestion(category)
    };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorDetails = this.getErrorDetails();

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className={`inline-flex p-3 rounded-full ${this.getCategoryColor(errorDetails?.category || 'unknown')} mb-4`}>
                {errorDetails && this.getCategoryIcon(errorDetails.category)}
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h2>
              
              <p className="text-gray-600 mb-6">
                {errorDetails?.suggestion || 'An unexpected error occurred. Please try again.'}
              </p>

              {errorDetails && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Error Details:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${this.getCategoryColor(errorDetails.category)}`}>
                      {errorDetails.category.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Error ID: {this.state.errorId}</p>
                    <p>Severity: {errorDetails.severity}</p>
                    <p>Timestamp: {new Date().toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {errorDetails?.retryable && (
                  <button
                    onClick={this.handleRetry}
                    disabled={this.state.isReporting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {this.state.isReporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={this.handleReload}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reload Page
                </button>
              </div>

              {this.props.showDetails && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Technical Details
                  </summary>
                  <div className="mt-3 p-3 bg-gray-50 rounded text-xs font-mono overflow-auto max-h-40">
                    <div className="text-red-600 mb-2">{this.state.error.message}</div>
                    {this.state.error.stack && (
                      <pre className="text-gray-600">{this.state.error.stack}</pre>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
