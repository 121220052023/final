import { ArrowUp, Heart, Mail, Sparkles, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const footerColumns = [
  {
    title: 'Discover',
    links: [
      { label: 'Home', to: '/' },
      { label: 'For You', to: '/for-you' },
      { label: 'Trending', to: '/trending' },
    ],
  },
  {
    title: 'Library',
    links: [
      { label: 'Watchlist', to: '/watchlist' },
      { label: 'Liked', to: '/liked-movies' },
      { label: 'History', to: '/history' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Pricing', to: '/pricing' },
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
    ],
  },
];

export default function Footer() {
  const { isAdmin } = useAuth();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <footer className="mt-24 border-t border-border bg-card/50 pb-12 pt-12">
        <div className="page-shell-wide grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="space-y-5">
            <div className="display-font text-3xl font-bold text-foreground">Ocean of Movies</div>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              A wider front page for movies, series, books, saved shelves, and a personal lane that learns from what you actually watch.
            </p>

            <div className="flex items-center gap-3 text-muted-foreground">
              <a href="mailto:medora9990@gmail.com" className="btn-secondary h-11 w-11 rounded-full p-0">
                <Mail className="h-4 w-4" />
              </a>
              {isAdmin ? (
                <Link to="/admin" className="btn-secondary h-11 w-11 rounded-full p-0">
                  <Shield className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link to="/liked-movies" className="btn-secondary h-11 w-11 rounded-full p-0">
                    <Heart className="h-4 w-4" />
                  </Link>
                  <Link to="/for-you" className="btn-secondary h-11 w-11 rounded-full p-0">
                    <Sparkles className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>
          </div>

          {!isAdmin && footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                {column.title}
              </h3>
              <div className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="block text-sm font-medium text-foreground/88 transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="page-shell-wide mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs uppercase tracking-[0.24em] text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Ocean of Movies</span>
          <span>Discovery, watch later, and personal taste in one place</span>
        </div>
      </footer>

      <AnimatePresence>
        {showScrollTop ? (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="btn-primary fixed bottom-6 left-6 z-40 h-12 w-12 rounded-full p-0"
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}
