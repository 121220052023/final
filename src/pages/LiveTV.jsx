// LiveTV v2 - BeIN Sports
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tv, Activity, Globe, Search, RefreshCw, Info,
  ChevronDown, ExternalLink, Server, Wifi, WifiOff,
} from 'lucide-react';
import HybridPlayer from '../components/HybridPlayer';

// ════════════════════════════════════════════════════════════════════════════
// CHANNEL LIST
// Each channel can have multiple "servers" (URLs) the user can switch between.
// Types: 'embed' | 'hls' | 'youtube'
// ════════════════════════════════════════════════════════════════════════════
const CHANNELS = [
  // ── BeIN Sports ──────────────────────────────────────────────────────────
  {
    id: 'bein1',
    name: 'beIN Sports 1 HD',
    category: 'BeIN Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/en/1/1a/BeIN_Sports_logo.svg',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-34.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-34.php' },
      { label: 'Server 3', url: 'https://www.streameast.is/embed/beIN-Sports-1' },
    ],
  },
  {
    id: 'bein2',
    name: 'beIN Sports 2 HD',
    category: 'BeIN Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/en/1/1a/BeIN_Sports_logo.svg',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-10.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-10.php' },
      { label: 'Server 3', url: 'https://www.streameast.is/embed/beIN-Sports-2' },
    ],
  },
  {
    id: 'bein3',
    name: 'beIN Sports 3 HD',
    category: 'BeIN Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/en/1/1a/BeIN_Sports_logo.svg',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-36.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-36.php' },
      { label: 'Server 3', url: 'https://www.streameast.is/embed/beIN-Sports-3' },
    ],
  },
  {
    id: 'bein4',
    name: 'beIN Sports 4 HD',
    category: 'BeIN Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/en/1/1a/BeIN_Sports_logo.svg',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-37.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-37.php' },
      { label: 'Server 3', url: 'https://www.streameast.is/embed/beIN-Sports-4' },
    ],
  },
  {
    id: 'bein5',
    name: 'beIN Sports 5 HD',
    category: 'BeIN Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/en/1/1a/BeIN_Sports_logo.svg',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-61.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-61.php' },
      { label: 'Server 3', url: 'https://www.streameast.is/embed/beIN-Sports-5' },
    ],
  },
  {
    id: 'beinmax',
    name: 'beIN Sports MAX',
    category: 'BeIN Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/en/1/1a/BeIN_Sports_logo.svg',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-38.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-38.php' },
      { label: 'Server 3', url: 'https://www.streameast.is/embed/beIN-Sports-MAX' },
    ],
  },
  {
    id: 'beinprem1',
    name: 'beIN Sports Premium 1',
    category: 'BeIN Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/en/1/1a/BeIN_Sports_logo.svg',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-39.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-39.php' },
      { label: 'Server 3', url: 'https://www.streameast.is/embed/beIN-Sports-Premium-1' },
    ],
  },
  {
    id: 'beinprem2',
    name: 'beIN Sports Premium 2',
    category: 'BeIN Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/en/1/1a/BeIN_Sports_logo.svg',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-40.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-40.php' },
      { label: 'Server 3', url: 'https://www.streameast.is/embed/beIN-Sports-Premium-2' },
    ],
  },

  // ── Arabic / Middle‑East Sports ───────────────────────────────────────────
  {
    id: 'abu-dhabi-sports',
    name: 'Abu Dhabi Sports 1',
    category: 'Arabic Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cf/Abu_Dhabi_Sports_1_logo.png/250px-Abu_Dhabi_Sports_1_logo.png',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-11.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-11.php' },
    ],
  },
  {
    id: 'ssc1',
    name: 'SSC Sports 1',
    category: 'Arabic Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/SSC_Sports_logo.png/250px-SSC_Sports_logo.png',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-35.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-35.php' },
    ],
  },
  {
    id: 'sharjah-sports',
    name: 'Sharjah Sports',
    category: 'Arabic Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/ar/thumb/2/2f/Sharjah_Sports_logo.png/250px-Sharjah_Sports_logo.png',
    servers: [
      { label: 'HLS', url: 'https://svs.itworkscdn.net/smc4sportslive/smc4.smil/playlist.m3u8' },
      { label: 'Server 2', url: 'https://dlstreams.top/embed/stream-67.php' },
    ],
  },

  // ── Global Sports ─────────────────────────────────────────────────────────
  {
    id: 'skysports-pl',
    name: 'Sky Sports Premier League',
    category: 'Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/84/Sky_Sports_logo_2020.svg/200px-Sky_Sports_logo_2020.svg.png',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-20.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-20.php' },
      { label: 'Server 3', url: 'https://www.streameast.is/embed/Sky-Sports-Premier-League' },
    ],
  },
  {
    id: 'skysports-football',
    name: 'Sky Sports Football',
    category: 'Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/84/Sky_Sports_logo_2020.svg/200px-Sky_Sports_logo_2020.svg.png',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-13.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-13.php' },
      { label: 'Server 3', url: 'https://www.streameast.is/embed/Sky-Sports-Football' },
    ],
  },
  {
    id: 'sky-sports-news',
    name: 'Sky Sports News 24/7',
    category: 'Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/84/Sky_Sports_logo_2020.svg/200px-Sky_Sports_logo_2020.svg.png',
    servers: [
      { label: 'YouTube', url: 'https://www.youtube.com/embed/live_stream?channel=UCNAf1k0yIjyGu3k9BwAg3lg&autoplay=1' },
      { label: 'Server 2', url: 'https://dlstreams.top/embed/stream-45.php' },
    ],
  },
  {
    id: 'espn-yt',
    name: 'ESPN',
    category: 'Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/1200px-ESPN_wordmark.svg.png',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-8.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-8.php' },
      { label: 'Server 3', url: 'https://www.streameast.is/embed/ESPN' },
    ],
  },
  {
    id: 'eurosport',
    name: 'Eurosport 1',
    category: 'Sports',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Eurosport_logo.svg/1200px-Eurosport_logo.svg.png',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-60.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-60.php' },
      { label: 'Server 3', url: 'https://www.streameast.is/embed/Eurosport-1' },
    ],
  },

  // ── Arabic News ─────────────────────────────────────────────────────────
  {
    id: 'aljazeera',
    name: 'Al Jazeera Arabic',
    category: 'Arabic News',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/05/Al_Jazeera_logo.svg/1200px-Al_Jazeera_logo.svg.png',
    servers: [
      { label: 'YouTube Live', url: 'https://www.youtube.com/embed/live_stream?channel=UCriyDHouraQFv7NORdvHMoQ&autoplay=1' },
    ],
  },
  {
    id: 'alarabiya',
    name: 'Al Arabiya',
    category: 'Arabic News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Al-Arabiya.svg/1200px-Al-Arabiya.svg.png',
    servers: [
      { label: 'YouTube Live', url: 'https://www.youtube.com/embed/live_stream?channel=UCeRVE9XQ4J7G5C0IjqzKzog&autoplay=1' },
    ],
  },
  {
    id: 'skynewsarabia',
    name: 'Sky News Arabia',
    category: 'Arabic News',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/Sky_News_Arabia_logo.png/1200px-Sky_News_Arabia_logo.png',
    servers: [
      { label: 'Live HLS', url: 'https://live-stream.skynewsarabia.com/c-horizontal-channel/horizontal-stream/index.m3u8' },
      { label: 'YouTube', url: 'https://www.youtube.com/embed/live_stream?channel=UCIJXOvggjKtCagMfxvcCzAA&autoplay=1' },
    ],
  },

  // ── English News ─────────────────────────────────────────────────────────
  {
    id: 'aljazeeraen',
    name: 'Al Jazeera English',
    category: 'English News',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Aljazeera_logo.svg/1200px-Aljazeera_logo.svg.png',
    servers: [
      { label: 'YouTube Live', url: 'https://www.youtube.com/embed/live_stream?channel=UCNv-wCBWeRRhb8-dC7O4Eiw&autoplay=1' },
    ],
  },
  {
    id: 'bbcnews',
    name: 'BBC News',
    category: 'English News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/BBC_News_2019.svg/1024px-BBC_News_2019.svg.png',
    servers: [
      { label: 'YouTube Live', url: 'https://www.youtube.com/embed/live_stream?channel=UC16niRr50-MSBwiO3YDb3RA&autoplay=1' },
    ],
  },
  {
    id: 'france24en',
    name: 'France 24 English',
    category: 'English News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/France_24_logo.svg/1200px-France_24_logo.svg.png',
    servers: [
      { label: 'YouTube Live', url: 'https://www.youtube.com/embed/live_stream?channel=UCQdS5oAFSwGxkigSB2B3I2g&autoplay=1' },
    ],
  },
  {
    id: 'dwnews',
    name: 'DW News',
    category: 'English News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Deutsche_Welle_logo.svg/1200px-Deutsche_Welle_logo.svg.png',
    servers: [
      { label: 'YouTube Live', url: 'https://www.youtube.com/embed/live_stream?channel=UCknLrEdhRCp1aegoMqRaCZg&autoplay=1' },
    ],
  },
  {
    id: 'cnn',
    name: 'CNN International',
    category: 'English News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN.svg/1200px-CNN.svg.png',
    servers: [
      { label: 'Server 1', url: 'https://dlstreams.top/embed/stream-9.php' },
      { label: 'Server 2', url: 'https://daddyhd.com/embed/stream-9.php' },
    ],
  },

  // ── Entertainment ─────────────────────────────────────────────────────────
  {
    id: 'nasa',
    name: 'NASA TV Live',
    category: 'Entertainment',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/1200px-NASA_logo.svg.png',
    servers: [
      { label: 'YouTube', url: 'https://www.youtube.com/embed/live_stream?channel=UCLA_DiR1FfKNvjuUpBHmylQ&autoplay=1' },
    ],
  },
  {
    id: 'lofi',
    name: 'Lofi Girl Radio',
    category: 'Entertainment',
    logo: 'https://yt3.googleusercontent.com/ytc/AIdro_mDjZ4h9E0aK8mR3f3cZbFjXQhLm4rJ4gK7nZ8=s800-c-k-c0x00ffffff-no-rj',
    servers: [
      { label: 'YouTube', url: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1' },
    ],
  },
];

// Derive ordered category list (BeIN Sports always first)
const CATEGORY_ORDER = ['BeIN Sports', 'Arabic Sports', 'Sports', 'Arabic News', 'English News', 'Entertainment'];
const ALL_CATEGORIES = ['All', ...CATEGORY_ORDER];

// ─────────────────────────────────────────────────────────────────────────────

const LiveTV = () => {
  const [activeChannel, setActiveChannel] = useState(CHANNELS[0]);
  const [activeServer, setActiveServer]   = useState(0); // index in channel.servers
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm]       = useState('');
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [playerKey, setPlayerKey]         = useState(0);

  const filteredChannels = useMemo(() => {
    let list = CHANNELS;
    if (activeCategory !== 'All') {
      list = list.filter(c => c.category === activeCategory);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, searchTerm]);

  const groupedChannels = useMemo(() => {
    const grouped = {};
    CATEGORY_ORDER.forEach(cat => { grouped[cat] = []; });
    filteredChannels.forEach(ch => {
      const cat = ch.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ch);
    });
    return grouped;
  }, [filteredChannels]);

  const handleChannelSelect = useCallback((channel) => {
    setActiveChannel(channel);
    setActiveServer(0);
    setPlayerKey(k => k + 1);
    setSidebarOpen(false);
  }, []);

  const handleServerSwitch = useCallback((idx) => {
    setActiveServer(idx);
    setPlayerKey(k => k + 1);
  }, []);

  const handleRetry = useCallback(() => setPlayerKey(k => k + 1), []);

  const currentUrl = activeChannel?.servers?.[activeServer]?.url;

  return (
    <div className="min-h-screen bg-background pt-28 pb-16">
      <div className="page-shell-wide">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="section-label">Live Broadcast</div>
          <h1 className="display-font mt-3 text-4xl font-bold leading-[0.92] md:text-5xl">
            Live TV Channels
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            beIN Sports, Sky Sports, Al Jazeera & more — live from your browser
          </p>
        </motion.div>

        {/* Search & Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search channels…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowCategoryMenu(m => !m)}
              className="flex items-center gap-2 px-5 py-3 bg-card border border-border rounded-xl hover:bg-muted transition-colors whitespace-nowrap"
            >
              <span className="font-medium">{activeCategory}</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${showCategoryMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showCategoryMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCategoryMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 right-0 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[200px]"
                  >
                    <div className="max-h-[300px] overflow-y-auto py-2">
                      {ALL_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setActiveCategory(cat); setShowCategoryMenu(false); }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-muted transition-colors ${
                            activeCategory === cat ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* ── Player section ──────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Video player */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-border shadow-2xl">
              {/* LIVE badge */}
              <div className="absolute top-4 left-4 z-30 px-3 py-1.5 rounded-lg bg-red-600/90 backdrop-blur-md flex items-center gap-2 pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">LIVE</span>
              </div>

              {/* Reload button */}
              <button
                onClick={handleRetry}
                className="absolute top-4 right-4 z-30 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-colors"
                title="Reload stream"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {currentUrl ? (
                <HybridPlayer
                  key={`${activeChannel.id}-${activeServer}-${playerKey}`}
                  url={currentUrl}
                  title={activeChannel.name}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground">Select a channel to watch</p>
                </div>
              )}
            </div>

            {/* Channel info + server switcher */}
            <div className="editorial-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-muted p-2 flex items-center justify-center shrink-0">
                  {activeChannel?.logo ? (
                    <img
                      src={activeChannel.logo}
                      alt={activeChannel.name}
                      className="max-w-full max-h-full object-contain"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <Tv className="w-7 h-7 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                    {activeChannel?.category || 'Live TV'}
                  </div>
                  <h2 className="text-xl font-bold text-foreground truncate">
                    {activeChannel?.name || 'Select a channel'}
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5" />
                      <span className="text-green-500 font-medium">Live</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span className="capitalize">
                        {activeChannel?.servers?.[activeServer]?.url?.includes('m3u8') ? 'HLS Stream' :
                         activeChannel?.servers?.[activeServer]?.url?.includes('youtube') ? 'YouTube Live' : 'Embed'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Server switcher */}
              {activeChannel?.servers?.length > 1 && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Server className="w-3.5 h-3.5" /> Switch Server
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeChannel.servers.map((srv, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleServerSwitch(idx)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          activeServer === idx
                            ? 'bg-primary text-white shadow-md shadow-primary/30'
                            : 'bg-muted text-foreground hover:bg-muted/80 border border-border'
                        }`}
                      >
                        {activeServer === idx
                          ? <Wifi className="w-3.5 h-3.5" />
                          : <WifiOff className="w-3.5 h-3.5 opacity-50" />
                        }
                        {srv.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-card rounded-xl p-4 border border-border">
              <h3 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Tips for best experience
              </h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  If a stream doesn&apos;t load, switch to <strong className="text-foreground">Server 2</strong> or <strong className="text-foreground">Server 3</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  beIN Sports channels use embed streams — may show a short ad first
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  News channels (Al Jazeera, BBC) use YouTube Live — always reliable
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Click <strong className="text-foreground">↺ Reload</strong> if you see a black screen
                </li>
              </ul>
            </div>
          </div>

          {/* ── Channel sidebar (desktop) ───────────────────────────────── */}
          <div className="hidden lg:block">
            <div className="editorial-panel rounded-2xl flex flex-col h-[calc(100vh-300px)] sticky top-28">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-bold text-sm text-foreground">Channels</h3>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {filteredChannels.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {Object.entries(groupedChannels).map(([category, categoryChannels]) =>
                  categoryChannels.length === 0 ? null : (
                    <div key={category} className="mb-5 last:mb-0">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-2">
                        {category}
                      </h4>
                      <div className="space-y-1">
                        {categoryChannels.map(channel => (
                          <button
                            key={channel.id}
                            onClick={() => handleChannelSelect(channel)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                              activeChannel?.id === channel.id
                                ? 'bg-primary/10 border border-primary/30'
                                : 'bg-muted/40 hover:bg-muted border border-transparent'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-lg bg-background p-1.5 flex items-center justify-center shrink-0">
                              {channel.logo ? (
                                <img
                                  src={channel.logo}
                                  alt={channel.name}
                                  className="max-w-full max-h-full object-contain"
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <Tv className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className={`text-xs font-bold truncate ${
                                activeChannel?.id === channel.id ? 'text-primary' : 'text-foreground'
                              }`}>
                                {channel.name}
                              </p>
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                {channel.servers.length > 1
                                  ? `${channel.servers.length} servers`
                                  : channel.servers[0]?.label}
                              </p>
                            </div>
                            {activeChannel?.id === channel.id && (
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Channel button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-40 btn-primary px-5 py-3 rounded-full shadow-lg flex items-center gap-2"
        >
          <Tv className="w-5 h-5" />
          <span>Channels ({filteredChannels.length})</span>
        </button>

        {/* Mobile drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card border-l border-border"
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold text-foreground">Channels</h3>
                  <button onClick={() => setSidebarOpen(false)} className="btn-secondary p-2">✕</button>
                </div>
                <div className="p-3 border-b border-border">
                  <input
                    type="text"
                    placeholder="Search…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <div className="overflow-y-auto h-full pb-20 p-3 space-y-1">
                  {filteredChannels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => handleChannelSelect(channel)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        activeChannel?.id === channel.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-muted/40 hover:bg-muted border border-transparent'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-background p-1.5 flex items-center justify-center shrink-0">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            className="max-w-full max-h-full object-contain"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <Tv className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-bold ${
                          activeChannel?.id === channel.id ? 'text-primary' : 'text-foreground'
                        }`}>
                          {channel.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{channel.category}</p>
                      </div>
                      {activeChannel?.id === channel.id && (
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default LiveTV;
