import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AIAssistant from './components/AIAssistant';
import Home from './pages/Home';
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
import Actors from './pages/Actors';
import TVShows from './pages/TVShows';
import ArabicMovies from './pages/ArabicMovies';
import LiveTV from './pages/LiveTV';
import './App.css';
import { ThemeProvider } from 'next-themes';
import { WatchlistProvider } from './context/WatchlistContext';
import { LikedMoviesProvider } from './context/LikedMoviesContext';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <WatchlistProvider>
        <LikedMoviesProvider>
          <Router>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/movie/:id" element={<MovieDetails />} />
                  <Route path="/watch/:id" element={<WatchMovie />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/trending" element={<Trending />} />
                  <Route path="/actors" element={<Actors />} />
                  <Route path="/tv-shows" element={<TVShows />} />
                  <Route path="/arabic" element={<ArabicMovies />} />
                  <Route path="/live-tv" element={<LiveTV />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/watchlist" element={<Watchlist />} />
                  <Route path="/liked-movies" element={<LikedMovies />} />
                </Routes>
              </main>
              <Footer />
              <AIAssistant />
            </div>
          </Router>
        </LikedMoviesProvider>
      </WatchlistProvider>
    </ThemeProvider>
  );
}

export default App;
