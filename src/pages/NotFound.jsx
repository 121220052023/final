import { Link } from 'react-router-dom';
import { Film, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="editorial-panel rounded-[2rem] p-8 sm:p-12 max-w-lg w-full text-center">
        <Film className="mx-auto h-16 w-16 text-primary mb-6" />
        <h1 className="display-font text-7xl font-bold text-foreground mb-2">404</h1>
        <h2 className="display-font text-2xl font-bold text-foreground mb-3">Page not found</h2>
        <p className="text-sm leading-7 text-muted-foreground mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary px-6 py-3 justify-center">
            <Home className="h-4 w-4" />
            Go home
          </Link>
          <Link to="/search" className="btn-secondary px-6 py-3 justify-center">
            <Search className="h-4 w-4" />
            Search
          </Link>
        </div>
      </div>
    </div>
  );
}
