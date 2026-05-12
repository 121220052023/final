import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="editorial-panel rounded-[2rem] p-8 sm:p-12 max-w-lg w-full text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-primary mb-6" />
            <h1 className="display-font text-3xl font-bold text-foreground mb-3">Something went wrong</h1>
            <p className="text-sm leading-7 text-muted-foreground mb-8">
              An unexpected error occurred. You can try again or return to the home page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn-primary px-6 py-3 justify-center"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <Link to="/" className="btn-secondary px-6 py-3 justify-center">
                <Home className="h-4 w-4" />
                Go home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
