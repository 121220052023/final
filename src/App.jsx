import { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer';
import AIAssistant from './components/AIAssistant';
import Home from './pages/Home';
import MovieDetails from './pages/MovieDetails';
import ErrorBoundary from './components/ErrorBoundary';
import OnboardingModal from './components/OnboardingModal';
import { useAuth } from './context/AuthContext';
import './App.css';
import { ThemeProvider } from 'next-themes';
import { WatchlistProvider } from './context/WatchlistContext';
import { LikedMoviesProvider } from './context/LikedMoviesContext';
import { AuthProvider } from './context/AuthContext';
import { ParentalControlProvider } from './context/ParentalControlContext';
import { NotificationsProvider } from './context/NotificationsContext';

const ForYou = lazy(() => import('./pages/ForYou'));
const Pricing = lazy(() => import('./pages/Pricing'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const LikedMovies = lazy(() => import('./pages/LikedMovies'));
const Browse = lazy(() => import('./pages/Browse'));
const Trending = lazy(() => import('./pages/Trending'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const Profile = lazy(() => import('./pages/Profile'));
const Actors = lazy(() => import('./pages/Actors'));
const TVShows = lazy(() => import('./pages/TVShows'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Books = lazy(() => import('./pages/Books'));
const BookDetails = lazy(() => import('./pages/BookDetails'));
const ParentDashboard = lazy(() => import('./pages/parent/Dashboard'));
const ParentSettings = lazy(() => import('./pages/parent/Settings'));
const ParentActivity = lazy(() => import('./pages/parent/Activity'));
const ParentRequests = lazy(() => import('./pages/parent/Requests'));
const ChildProfile = lazy(() => import('./pages/parent/ChildProfile'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const NotFound = lazy(() => import('./pages/NotFound'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}

function OnboardingGate({ children }) {
  const { needsOnboarding, loading, completeOnboarding, user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && user && needsOnboarding) {
      setShowOnboarding(true);
    }
  }, [loading, user, needsOnboarding]);

  const handleClose = () => {
    setShowOnboarding(false);
    completeOnboarding();
  };

  return (
    <>
      {children}
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingModal onClose={handleClose} isFirstTime={true} />
        </Suspense>
      )}
    </>
  );
}

function AppRoutes() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/for-you" element={<ProtectedRoute><ForYou /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/actors" element={<Actors />} />
          <Route path="/tv-shows" element={<TVShows />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
          <Route path="/liked-movies" element={<ProtectedRoute><LikedMovies /></ProtectedRoute>} />
          <Route path="/books" element={<Books />} />
          <Route path="/book/:id" element={<BookDetails />} />
          <Route path="/parent/dashboard" element={<ProtectedRoute requireParent><ParentDashboard /></ProtectedRoute>} />
          <Route path="/parent/settings" element={<ProtectedRoute requireParent><ParentSettings /></ProtectedRoute>} />
          <Route path="/parent/activity" element={<ProtectedRoute requireParent><ParentActivity /></ProtectedRoute>} />
          <Route path="/parent/requests" element={<ProtectedRoute requireParent><ParentRequests /></ProtectedRoute>} />
          <Route path="/parent/child/:userId" element={<ProtectedRoute requireParent><ChildProfile /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // Block new tabs and popups globally
  useEffect(() => {
    // Override window.open
    const originalOpen = window.open;
    window.open = function() {
      return null;
    };

    // Block all suspicious links and navigation
    const handleClick = (e) => {
      // Block Ctrl+Click, Cmd+Click, Shift+Click (new tab attempts)
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      
      // Block links targeting _blank
      const target = e.target.closest('a');
      if (target && (target.target === '_blank' || target.getAttribute('target') === '_blank')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    
    // Block right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    // Cleanup on unmount
    return () => {
      window.open = originalOpen;
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <ParentalControlProvider>
            <NotificationsProvider>
              <WatchlistProvider>
                <LikedMoviesProvider>
                  <Router>
                    <OnboardingGate>
                      <ScrollToTop />
                      {/* Adult content toggle removed as per discovery catalog policy */}
                      <div className="min-h-screen flex flex-col">
                        <Navbar />
                        <main className="flex-1">
                          <AppRoutes />
                        </main>
                        <Footer />
                        <AIAssistant />
                      </div>
                    </OnboardingGate>
                  </Router>
                  <Toaster
                    position="bottom-right"
                    richColors
                    closeButton
                    toastOptions={{
                      style: {
                        background: 'var(--app-card)',
                        color: 'var(--app-foreground)',
                        border: '1px solid var(--app-border)',
                        fontFamily: "'Inter', sans-serif",
                      },
                    }}
                  />
                </LikedMoviesProvider>
              </WatchlistProvider>
            </NotificationsProvider>
          </ParentalControlProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
