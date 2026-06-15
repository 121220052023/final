import { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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
import { useParentalControls } from './context/ParentalControlContext';
import { Moon, Lock, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from './lib/supabase';
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
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminContent = lazy(() => import('./pages/admin/ContentManager'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminUserDetail = lazy(() => import('./pages/admin/UserDetail'));
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
  const { needsOnboarding, loading, completeOnboarding, user, profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && user && needsOnboarding && profile?.role !== 'child') {
      setShowOnboarding(true);
    }
  }, [loading, user, needsOnboarding, profile?.role]);

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

function ChildRestrictions() {
  const navigate = useNavigate();
  let ctx;
  try {
    ctx = useParentalControls();
  } catch {}
  if (!ctx) return null;

  const { isChild, isBedtime, isAccountLocked, loading } = ctx;
  const [showLock, setShowLock] = useState(false);
  const [locked, setLocked] = useState(false);
  const [bedtime, setBedtime] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (isChild && isAccountLocked()) {
      setLocked(true);
      setBedtime(false);
      setShowLock(true);
    } else if (isChild && isBedtime()) {
      setBedtime(true);
      setLocked(false);
      setShowLock(true);
    } else {
      setShowLock(false);
    }
  }, [isChild, isBedtime, isAccountLocked, loading]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!showLock) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center bg-card rounded-3xl p-8 border border-border/60"
      >
        {locked ? (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <Lock className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Account Locked</h2>
            <p className="text-muted-foreground mb-6">
              Your account has been locked by a parent. Please ask them to unlock it.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 mb-6 text-sm">
              <p className="font-semibold text-foreground">🔒 Access Restricted</p>
              <p className="text-muted-foreground mt-1">Contact your parent to regain access.</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary border-white/20 bg-black/30 text-white px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 mx-auto"
            >
              <LogOut className="h-4 w-4" />
              Back to Login
            </button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Moon className="w-10 h-10 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Bedtime Mode</h2>
            <p className="text-muted-foreground mb-6">
              It&apos;s past your bedtime. The app will unlock again in the morning.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 mb-6 text-sm">
              <p className="font-semibold text-foreground">Good night! 🌙</p>
              <p className="text-muted-foreground mt-1">Get some rest for tomorrow&apos;s adventures.</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary border-white/20 bg-black/30 text-white px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 mx-auto"
            >
              <LogOut className="h-4 w-4" />
              Back to Login
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

function AppLayout() {
  const { pathname } = useLocation();
  const isAuthPage = useMemo(() =>
    ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname),
  [pathname]);
  const isAdminPage = pathname.startsWith('/admin');
  let isChildUser = false;
  try {
    const ctx = useParentalControls();
    if (ctx?.isChild) isChildUser = true;
  } catch {}

  return (
    <div className="min-h-screen flex flex-col">
      {!isAuthPage && <Navbar />}
      <main className="flex-1 relative">
        <AppRoutes />
      </main>
      {!isAuthPage && <Footer />}
      {!isAuthPage && !isAdminPage && !isChildUser && <AIAssistant />}
      <ChildRestrictions />
    </div>
  );
}

function AppRoutes() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/for-you" element={<ProtectedRoute><ForYou /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/movie/:id" element={<ProtectedRoute><MovieDetails /></ProtectedRoute>} />
          <Route path="/browse" element={<ProtectedRoute><Browse /></ProtectedRoute>} />
          <Route path="/trending" element={<ProtectedRoute><Trending /></ProtectedRoute>} />
          <Route path="/actors" element={<ProtectedRoute><Actors /></ProtectedRoute>} />
          <Route path="/tv-shows" element={<ProtectedRoute><TVShows /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
          <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
          <Route path="/liked-movies" element={<ProtectedRoute><LikedMovies /></ProtectedRoute>} />
          <Route path="/books" element={<ProtectedRoute><Books /></ProtectedRoute>} />
          <Route path="/book/:id" element={<ProtectedRoute><BookDetails /></ProtectedRoute>} />
          <Route path="/parent/dashboard" element={<ProtectedRoute requireParent><ParentDashboard /></ProtectedRoute>} />
          <Route path="/parent/settings" element={<ProtectedRoute requireParent><ParentSettings /></ProtectedRoute>} />
          <Route path="/parent/activity" element={<ProtectedRoute requireParent><ParentActivity /></ProtectedRoute>} />
          <Route path="/parent/requests" element={<ProtectedRoute requireParent><ParentRequests /></ProtectedRoute>} />
          <Route path="/parent/child/:userId" element={<ProtectedRoute requireParent><ChildProfile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/content" element={<ProtectedRoute requireAdmin><AdminContent /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute requireAdmin><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/user/:userId" element={<ProtectedRoute requireAdmin><AdminUserDetail /></ProtectedRoute>} />

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
                      <AppLayout />
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
