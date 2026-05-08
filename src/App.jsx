import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer';
import AIAssistant from './components/AIAssistant';
import Home from './pages/Home';
import ForYou from './pages/ForYou';
import MovieDetails from './pages/MovieDetails';
import WatchMovie from './pages/WatchMovie';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import Watchlist from './pages/Watchlist';
import { LikedMovies } from './pages/LikedMovies';
import Browse from './pages/Browse';
import Trending from './pages/Trending';
import SearchResults from './pages/SearchResults';
import Profile from './pages/Profile';
import WatchHistory from './pages/WatchHistory';
import Actors from './pages/Actors';
import TVShows from './pages/TVShows';
import ArabicMovies from './pages/ArabicMovies';
import LiveTV from './pages/LiveTV';
import LiveScores from './pages/LiveScores';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import BookDetails from './pages/BookDetails';
import ParentDashboard from './pages/parent/Dashboard';
import ParentSettings from './pages/parent/Settings';
import ParentActivity from './pages/parent/Activity';
import ParentRequests from './pages/parent/Requests';
import ChildProfile from './pages/parent/ChildProfile';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import { ThemeProvider } from 'next-themes';
import { WatchlistProvider } from './context/WatchlistContext';
import { LikedMoviesProvider } from './context/LikedMoviesContext';
import { AuthProvider } from './context/AuthContext';
import { ParentalControlProvider } from './context/ParentalControlContext';

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <ParentalControlProvider>
          <WatchlistProvider>
            <LikedMoviesProvider>
              <Router>
                <ScrollToTop />
                <div className="min-h-screen flex flex-col">
                  <Navbar />
                  <main className="flex-1">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/for-you" element={<ForYou />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/dashboard" element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/movie/:id" element={<MovieDetails />} />
                      <Route path="/watch/:id" element={<WatchMovie />} />
                      <Route path="/browse" element={<Browse />} />
                      <Route path="/trending" element={<Trending />} />
                      <Route path="/actors" element={<Actors />} />
                      <Route path="/tv-shows" element={<TVShows />} />
                      <Route path="/arabic" element={<ArabicMovies />} />
                      <Route path="/live-tv" element={<LiveTV />} />
                      <Route path="/live-scores" element={<LiveScores />} />
                      <Route path="/search" element={<SearchResults />} />
                      <Route path="/profile" element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      } />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/watchlist" element={<Watchlist />} />
                      <Route path="/history" element={
                        <ProtectedRoute>
                          <WatchHistory />
                        </ProtectedRoute>
                      } />
                      <Route path="/liked-movies" element={<LikedMovies />} />
                      <Route path="/books" element={<Books />} />
                      <Route path="/book/:id" element={<BookDetails />} />
                      <Route path="/parent/dashboard" element={
                        <ProtectedRoute requireParent>
                          <ParentDashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/parent/settings" element={
                        <ProtectedRoute requireParent>
                          <ParentSettings />
                        </ProtectedRoute>
                      } />
                      <Route path="/parent/activity" element={
                        <ProtectedRoute requireParent>
                          <ParentActivity />
                        </ProtectedRoute>
                      } />
                      <Route path="/parent/requests" element={
                        <ProtectedRoute requireParent>
                          <ParentRequests />
                        </ProtectedRoute>
                      } />
                      <Route path="/parent/child/:userId" element={
                        <ProtectedRoute requireParent>
                          <ChildProfile />
                        </ProtectedRoute>
                      } />
                    </Routes>
                  </main>
                  <Footer />
                  <AIAssistant />
                </div>
              </Router>
            </LikedMoviesProvider>
          </WatchlistProvider>
        </ParentalControlProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
