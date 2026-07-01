import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, Clock, LogOut, Menu, Moon, Shield, Sparkles, Sun, User, X, ChevronDown, Languages } from 'lucide-react';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useAuth } from '../context/AuthContext';
import { useParentalControls } from '../context/ParentalControlContext';
import { useTranslation } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import { notificationService } from '../services/supabaseService';
import { watchTimeService } from '../services/watchTimeService';

const brandText = 'Ocean of Movies';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showUtilityMenu, setShowUtilityMenu] = useState(false);
  const [dailyUsedSeconds, setDailyUsedSeconds] = useState(0);
  const { resolvedTheme, setTheme } = useTheme();
  const { user, profile, session, signOut, isAdmin } = useAuth();
  const { isParent: isFamilyParent } = useParentalControls();
  const { isProOrAbove, plan } = useSubscription();
  const { lang, toggleLanguage, t } = useTranslation();
  const isParent = isFamilyParent || profile?.role === 'parent';
  const navigate = useNavigate();

  const primaryLinks = useMemo(() => [
    { label: t('nav.home', 'Home'), to: '/' },
    { label: t('nav.forYou', 'For You'), to: '/for-you' },
    { label: t('nav.movies', 'Movies'), to: '/browse' },
    { label: t('nav.series', 'Series'), to: '/tv-shows' },
    { label: t('nav.books', 'Books'), to: '/books' },
  ], [t]);

  const adminLinks = useMemo(() => [
    { label: t('nav.dashboard', 'Dashboard'), to: '/admin' },
    { label: t('nav.content', 'Content'), to: '/admin/content' },
    { label: t('nav.analytics', 'Analytics'), to: '/admin/analytics' },
    { label: t('nav.reports', 'Reports'), to: '/admin/reports' },
    { label: t('nav.settings', 'Settings'), to: '/admin/settings' },
  ], [t]);

  const utilityLinks = useMemo(() => [
    { label: t('nav.trending', 'Trending'), to: '/trending' },
    { label: t('nav.watchlist', 'Watchlist'), to: '/watchlist' },
    { label: t('nav.liked', 'Liked'), to: '/liked-movies' },
    { label: t('nav.actors', 'Actors'), to: '/actors' },
    { label: t('nav.pricing', 'Pricing'), to: '/pricing' },
    { label: t('nav.about', 'About'), to: '/about' },
    { label: t('nav.contact', 'Contact'), to: '/contact' },
    { label: 'Request Content', to: '/request-content' },
  ], [t]);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Fetch notifications
  useEffect(() => {
    if (user && session) {
      notificationService.get(user.id, session.access_token)
        .then(data => setNotifications(data || []))
        .catch(() => {});
    }
  }, [user, session]);

  // Fetch daily watch time for limited plans
  useEffect(() => {
    if (user && plan !== 'ultimate') {
      watchTimeService.getDailyUsage(user.id).then(setDailyUsedSeconds);
    } else {
      setDailyUsedSeconds(0);
    }
  }, [user, plan]);

  // Refresh watch time every 10s while watching
  useEffect(() => {
    if (!user || plan === 'ultimate') return;
    const interval = setInterval(() => {
      watchTimeService.getDailyUsage(user.id).then(setDailyUsedSeconds);
    }, 10000);
    return () => clearInterval(interval);
  }, [user, plan]);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markRead(id, user.id, session.access_token);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  const displayName = useMemo(() => {
    if (profile?.full_name) return profile.full_name;
    if (profile?.username) return profile.username;
    return null;
  }, [profile, profile?.full_name, profile?.username]);

  const links = isAdmin ? adminLinks : primaryLinks;

  const submitSearch = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setIsOpen(false);
    setShowUtilityMenu(false);
  };

  const handleLogout = async () => {
    await signOut();
    setIsOpen(false);
    setShowUtilityMenu(false);
    setShowNotifications(false);
    navigate('/');
  };

  return (
    <>
    <nav className="fixed inset-x-0 top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border transition-all duration-300">
      <div className="page-shell-wide py-3">
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 lg:gap-6">
              <Link to="/" className="flex shrink-0 items-center gap-2 transition-transform hover:scale-105">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="display-font text-xl font-black tracking-tighter text-foreground sm:text-2xl">
                  {brandText}
                </div>
              </Link>

              <div className="hidden items-center gap-1 xl:flex">
                {links.map((link) => (
                  <NavLink 
                    key={link.to} 
                    to={link.to} 
                    end={link.to === '/admin' || link.to === '/'}
                    className={({ isActive }) => 
                      `px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                        isActive 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>

              <div className="hidden items-center gap-2 xl:flex">
                <button
                  onClick={toggleLanguage}
                  className="h-10 w-10 rounded-xl border border-border bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                  title={lang === 'en' ? 'العربية' : 'English'}
                >
                  <Languages className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1.5 px-1.5 h-10 rounded-xl border border-border bg-muted/30">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-1.5 rounded-lg transition-all ${
                      resolvedTheme === 'light' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    aria-label="Light mode"
                  >
                    <Sun className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-1.5 rounded-lg transition-all ${
                      resolvedTheme === 'dark' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    aria-label="Dark mode"
                  >
                    <Moon className="h-4 w-4" />
                  </button>
                </div>

              {!isAdmin && (
              <div
                className="relative hidden xl:block"
                onMouseEnter={() => setShowUtilityMenu(true)}
                onMouseLeave={() => setShowUtilityMenu(false)}
              >
                <button className="btn-secondary h-10 px-4 rounded-xl font-bold flex items-center gap-2">
                  <span>{t('nav.explore', 'Explore')}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showUtilityMenu ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showUtilityMenu ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 grid min-w-[220px] gap-1 rounded-2xl bg-card border border-border p-2 shadow-2xl z-50"
                    >
                      {utilityLinks.map((link) => (
                        <NavLink
                          key={link.to + link.label}
                          to={link.to}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`
                          }
                        >
                          {link.label}
                        </NavLink>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
              )}

              <div className="h-6 w-px bg-border mx-1" />

              {user ? (
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-card hover:border-purple-500/50 hover:text-purple-500 transition-all group"
                      title="Admin Dashboard"
                    >
                      <Shield className="h-4 w-4 text-purple-500" />
                      <span className="hidden lg:inline text-xs font-bold text-foreground group-hover:text-purple-500 transition-colors">
                        {t('nav.admin', 'Admin')}
                      </span>
                    </Link>
                  )}
                  {isParent && (
                    <Link
                      to="/parent/dashboard"
                      className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-card hover:border-amber-500/50 hover:text-amber-500 transition-all group"
                      title="Parent Dashboard"
                    >
                      <Shield className="h-4 w-4 text-amber-500" />
                      <span className="hidden lg:inline text-xs font-bold text-foreground group-hover:text-amber-500 transition-colors">
                        {t('nav.parent', 'Parent')}
                      </span>
                    </Link>
                  )}

                  {plan !== 'ultimate' && dailyUsedSeconds > 0 && (
                    <div className={`flex items-center gap-1.5 h-10 px-3 rounded-xl border text-xs font-bold ${
                      watchTimeService.isLimitReached(plan, dailyUsedSeconds)
                        ? 'border-red-500/30 bg-red-500/10 text-red-400'
                        : 'border-amber-500/20 bg-amber-500/5 text-amber-400'
                    }`}>
                      <Clock className="h-3.5 w-3.5" />
                      <span>{watchTimeService.getRemainingMinutes(plan, dailyUsedSeconds)}m</span>
                    </div>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="btn-secondary h-10 w-10 p-0 rounded-xl relative"
                      title={t('nav.notifications', 'Notifications')}
                    >
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-background animate-in zoom-in">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {showNotifications && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowNotifications(false)} 
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-card border border-border p-2 shadow-2xl z-50 overflow-hidden"
                          >
                            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                              <span className="text-sm font-bold">{t('nav.notifications', 'Notifications')}</span>
                              {unreadCount > 0 && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                  {unreadCount} {t('nav.new', 'New')}
                                </span>
                              )}
                            </div>
                            <div className="max-h-[350px] overflow-y-auto py-1 scrollbar-thin">
                              {notifications.length > 0 ? (
                                notifications.map((n) => (
                                  <div
                                    key={n.id}
                                    onClick={() => handleMarkRead(n.id)}
                                    className={`px-4 py-3 hover:bg-muted transition-colors cursor-pointer relative group ${!n.is_read ? 'bg-primary/5' : ''}`}
                                  >
                                    {!n.is_read && (
                                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary" />
                                    )}
                                    <div className="text-sm font-bold text-foreground mb-0.5">{n.title}</div>
                                    <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                                    <div className="text-[10px] text-muted-foreground/60 mt-1.5">
                                      {new Date(n.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-10 text-center">
                                  <Bell className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                                  <div className="text-sm text-muted-foreground font-medium">{t('nav.noNotifications', 'No notifications yet')}</div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <Link 
                    to="/profile" 
                    className="flex items-center gap-3 h-10 pl-3 pr-4 rounded-xl border border-border bg-card hover:border-primary transition-all group"
                  >
                    <div className="h-7 w-7 rounded-lg overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {user.email?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {displayName && (
                    <span className="max-w-[8rem] truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {displayName}
                    </span>
                    )}
                  </Link>

                  <button 
                    onClick={handleLogout} 
                    className="btn-secondary h-10 w-10 p-0 rounded-xl"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="btn-ghost h-10 px-4 font-bold">
                    {t('nav.signIn', 'Sign in')}
                  </Link>
                  <Link to="/signup" className="btn-primary h-10 px-5 rounded-xl font-bold shadow-lg shadow-primary/20">
                    {t('nav.getStarted', 'Get Started')}
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 xl:hidden">
              {user && (
                <button
                  onClick={() => {
                    setIsOpen(true);
                    setShowNotifications(true);
                  }}
                  className="btn-secondary h-9 w-9 p-0 rounded-xl relative"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white ring-2 ring-background">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setIsOpen((open) => !open)}
                className="btn-secondary px-2.5 py-1.5"
                aria-label="Open navigation"
              >
                {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

        <AnimatePresence>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-immersive mt-3 rounded-[1.6rem] p-4 xl:hidden"
            >
              <div className="mb-4 grid grid-cols-2 gap-2">
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/admin' || link.to === '/'}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `rounded-[1rem] px-4 py-3 text-sm font-semibold ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'border border-border bg-card text-muted-foreground'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>

              <AnimatePresence>
                {showNotifications && user && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-4 overflow-hidden rounded-[1.2rem] border border-border bg-card"
                  >
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <span className="text-sm font-bold">{t('nav.notifications', 'Notifications')}</span>
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-primary font-bold"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto py-1">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkRead(n.id)}
                            className={`px-4 py-3 border-b border-border/50 last:border-0 ${!n.is_read ? 'bg-primary/5' : ''}`}
                          >
                            <div className="text-sm font-bold text-foreground mb-0.5">{n.title}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                            <div className="text-[10px] text-muted-foreground/60 mt-1.5">
                              {new Date(n.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No notifications
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isAdmin && (
              <details className="mb-4 rounded-[1.2rem] border border-border bg-card">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">
                  {t('nav.moreOptions', 'More options')}
                </summary>
                <div className="grid grid-cols-2 gap-2 p-2">
                  {utilityLinks.map((link) => (
                    <NavLink
                      key={link.to + link.label}
                      to={link.to}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) =>
                        `rounded-[1rem] px-4 py-3 text-sm font-semibold ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              </details>
              )}

              <div className="mb-4 flex items-center justify-between rounded-[1.2rem] border border-border bg-card px-4 py-3">
                <span className="text-sm font-semibold text-foreground">{t('nav.appearance', 'Appearance')}</span>
                <div className="flex items-center gap-1 rounded-full bg-muted p-1">
                  <button
                    onClick={() => setTheme('light')}
                    className={`rounded-full px-3 py-2 ${resolvedTheme === 'light' ? 'bg-primary text-white' : 'text-muted-foreground'}`}
                  >
                    <Sun className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`rounded-full px-3 py-2 ${resolvedTheme === 'dark' ? 'bg-primary text-white' : 'text-muted-foreground'}`}
                  >
                    <Moon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={toggleLanguage}
                className="mb-4 w-full flex items-center justify-between rounded-[1.2rem] border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
              >
                <span className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  {lang === 'en' ? 'English' : 'العربية'}
                </span>
                <span className="text-xs text-muted-foreground">{lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}</span>
              </button>

              <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-3">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </span>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-foreground">{displayName || 'Loading...'}</div>
                    <div className="text-xs text-muted-foreground">{user ? t('nav.signedIn', 'Signed in') : t('nav.guest', 'Guest')}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                      <Link to="/admin" onClick={() => setIsOpen(false)} className="btn-secondary px-3 py-2 text-sm flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-purple-500" />
                        {t('nav.admin', 'Admin')}
                      </Link>
                  )}
                  {isParent && (
                      <Link to="/parent/dashboard" onClick={() => setIsOpen(false)} className="btn-secondary px-3 py-2 text-sm flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-amber-500" />
                        {t('nav.parent', 'Parent')}
                      </Link>
                  )}

                  {user ? (
                    <button onClick={handleLogout} className="btn-secondary px-4 py-2 text-sm">
                      {t('nav.logout', 'Logout')}
                    </button>
                  ) : (
                    <Link to="/login" onClick={() => setIsOpen(false)} className="btn-primary px-4 py-2 text-sm">
                      {t('nav.signIn', 'Sign in')}
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </nav>
    </>
  );
}
