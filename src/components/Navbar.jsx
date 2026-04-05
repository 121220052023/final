import { Link } from 'react-router-dom';
import { Film, Menu, X, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Switch } from '../components/ui/switch';
import GoogleSignIn from './GoogleSignIn';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Browse', path: '/browse' },
    { name: 'Trending', path: '/trending' },
    { name: 'TV Shows', path: '/tv-shows' },
    { name: '🌙 Arabic', path: '/arabic' },
    { name: '📺 Live TV', path: '/live-tv' },
    { name: 'Actors', path: '/actors' },
    { name: 'Watchlist', path: '/watchlist' },
    { name: 'Liked', path: '/liked-movies' },
  ];

  const moreLinks = [
    { name: 'Profile', path: '/profile' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-card/80 border-b border-white/10 shadow-lg shadow-purple-500/10">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <Film className="w-8 h-8 text-purple-500" />
              <motion.div
                className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-0 group-hover:opacity-50"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            <span className="text-xl font-black gradient-header bg-clip-text text-transparent tracking-tight">
              Ocean of Movies
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link, index) => (
              <motion.div
                key={link.path}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link
                  to={link.path}
                  className="relative text-foreground hover:text-purple-500 transition-all duration-300 font-semibold group px-2.5 py-1.5 text-sm"
                >
                  <span className="relative z-10">{link.name}</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    layoutId="navbar-hover"
                  />
                </Link>
              </motion.div>
            ))}

            {/* More Dropdown */}
            <div className="relative group/more">
              <button className="text-foreground hover:text-purple-500 transition-all duration-300 font-semibold px-2.5 py-1.5 text-sm">
                More ▾
              </button>
              <div className="absolute right-0 top-full mt-1 w-40 bg-card/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl opacity-0 invisible group-hover/more:opacity-100 group-hover/more:visible transition-all duration-200 py-2 z-50">
                {moreLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="block px-4 py-2 text-sm text-foreground hover:text-purple-500 hover:bg-white/5 transition-all font-semibold"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/10">
              <motion.div
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/10"
                whileHover={{ scale: 1.05 }}
              >
                <Sun className="h-4 w-4 text-yellow-500" />
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
                <Moon className="h-4 w-4 text-blue-400" />
              </motion.div>
              <GoogleSignIn />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-foreground hover:text-purple-500 transition-colors p-2 rounded-lg hover:bg-white/5"
            whileTap={{ scale: 0.9 }}
          >
            {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </motion.button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden bg-card/50 backdrop-blur-xl rounded-2xl mt-2 mb-4 border border-white/10"
            >
              <div className="py-4 px-4 space-y-1">
                {[...navLinks, ...moreLinks].map((link, index) => (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Link
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className="block text-foreground hover:text-purple-500 transition-all duration-300 font-semibold py-2.5 px-4 rounded-xl hover:bg-white/5"
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
                <div className="flex items-center justify-center gap-3 pt-3 px-4 py-3 bg-white/5 rounded-xl">
                  <Sun className="h-5 w-5 text-yellow-500" />
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                  <Moon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="pt-2">
                  <GoogleSignIn />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;
