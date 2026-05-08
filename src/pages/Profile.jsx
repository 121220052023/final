import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Settings, Bell, Palette, Moon, Sun, Monitor, Sparkles, Mail, Edit2, Check, X as XIcon, Camera, Shield, ArrowRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '../context/AuthContext';
import { useParentalControls } from '../context/ParentalControlContext';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { theme, setTheme } = useTheme();
  const { user, profile: userProfile, updateProfile, uploadAvatar, loading: authLoading } = useAuth();
  const { isParent } = useParentalControls();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [localProfile, setLocalProfile] = useState({
    name: '',
    email: '',
    avatar: '',
  });
  const [originalName, setOriginalName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notificationSettings');
    return saved ? JSON.parse(saved) : {
      newReleases: true,
      recommendations: true,
      watchlistUpdates: false,
      newsletter: true,
    };
  });

  const [playbackSettings, setPlaybackSettings] = useState(() => {
    const saved = localStorage.getItem('playbackSettings');
    return saved ? JSON.parse(saved) : {
      autoplayTrailers: true,
      showAdultContent: false,
    };
  });

  // Apply theme on mount from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, [setTheme]);

  // Save notification settings to localStorage and broadcast
  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { type: 'notifications', value: notifications } }));
  }, [notifications]);

  // Save playback settings to localStorage and broadcast
  useEffect(() => {
    localStorage.setItem('playbackSettings', JSON.stringify(playbackSettings));
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { type: 'playback', value: playbackSettings } }));
  }, [playbackSettings]);

  useEffect(() => {
    if (userProfile || user) {
      const name = userProfile?.username || userProfile?.full_name || user?.email?.split('@')[0] || '';
      const email = userProfile?.email || user?.email || '';
      setLocalProfile({
        name,
        email,
        avatar: userProfile?.avatar_url || '',
      });
      setOriginalName(name);
      setTempName(name);
    }
  }, [userProfile, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handlePlaybackToggle = (key) => {
    setPlaybackSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const themeOptions = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  const handleNameEdit = () => {
    setTempName(localProfile.name);
    setIsEditingName(true);
  };

  const handleNameSave = async () => {
    if (!tempName.trim()) {
      setTempName(originalName);
      setIsEditingName(false);
      return;
    }
    try {
      setIsSaving(true);
      await updateProfile({ username: tempName.trim() });
      setLocalProfile({ ...localProfile, name: tempName.trim() });
      setOriginalName(tempName.trim());
      setIsEditingName(false);
      setSaveMessage({ type: 'success', text: 'Name updated successfully!' });
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Failed to update name' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleNameCancel = () => {
    setTempName(originalName);
    setIsEditingName(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background pt-28 pb-16">
      <div className="page-shell-wide">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="section-label">Account</div>
          <h1 className="display-font mt-3 text-5xl font-bold leading-[0.92] md:text-6xl">
            Your Profile
          </h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </motion.div>

        {/* Save Message */}
        {saveMessage.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
              saveMessage.type === 'success'
                ? 'border-green-500/20 bg-green-500/8 text-green-400'
                : 'border-red-500/20 bg-red-500/8 text-red-400'
            }`}
          >
            {saveMessage.text}
          </motion.div>
        )}

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="editorial-panel rounded-[2rem] p-6 h-fit"
          >
            {/* Avatar */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                  {localProfile.avatar ? (
                    <img src={localProfile.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(localProfile.name)
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => document.getElementById('avatarInput').click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
                <input
                  type="file"
                  id="avatarInput"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      try {
                        const avatarUrl = await uploadAvatar(file);
                        setLocalProfile({ ...localProfile, avatar: avatarUrl });
                        setSaveMessage({ type: 'success', text: 'Avatar updated!' });
                      } catch (error) {
                        console.error('Error uploading avatar:', error);
                        setSaveMessage({ type: 'error', text: 'Failed to upload avatar' });
                      }
                      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
                    }
                  }}
                />
              </div>
              <h2 className="mt-4 text-xl font-bold text-foreground">{localProfile.name || 'User'}</h2>
              <p className="text-sm text-muted-foreground">{localProfile.email}</p>
            </div>

            <div className="w-full h-px bg-border my-6"></div>

            {/* Navigation */}
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Parent Dashboard Link */}
            {isParent && (
              <>
                <div className="w-full h-px bg-border my-6"></div>
                <button
                  onClick={() => navigate('/parent/dashboard')}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                >
                  <Shield className="w-5 h-5" />
                  <span>Parent Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
              </>
            )}
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="editorial-panel rounded-[2rem] p-6 sm:p-8"
          >
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <User className="w-5 h-5 text-purple-600" />
                    <h3 className="text-xl font-bold text-foreground">Profile Information</h3>
                  </div>

                  <div className="space-y-6">
                    {/* Name Field */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Display Name
                      </label>
                      {isEditingName ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleNameSave();
                              if (e.key === 'Escape') handleNameCancel();
                            }}
                            className="flex-1 px-4 py-3 rounded-xl bg-background text-foreground border border-border focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                            placeholder="Enter your name"
                            autoFocus
                          />
                          <button
                            onClick={handleNameSave}
                            disabled={isSaving}
                            className="btn-primary px-4 py-3 rounded-xl flex items-center gap-2"
                          >
                            {isSaving ? (
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Check className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={handleNameCancel}
                            className="btn-secondary px-4 py-3 rounded-xl"
                          >
                            <XIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-background border border-border">
                          <span className="text-foreground">{localProfile.name || 'Not set'}</span>
                          <button
                            onClick={handleNameEdit}
                            className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-2 text-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Email Field - Disabled */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Address
                      </label>
                      <div className="flex items-center px-4 py-3 rounded-xl bg-background border border-border opacity-70">
                        <span className="text-foreground flex-1">{localProfile.email}</span>
                        <span className="text-xs text-muted-foreground font-medium px-3 py-1 rounded-full bg-muted">
                          Cannot be changed
                        </span>
                      </div>
                    </div>

                    {/* Username from auth */}
                    {user?.user_metadata?.username && (
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Username
                        </label>
                        <div className="px-4 py-3 rounded-xl bg-background border border-border text-foreground">
                          @{user.user_metadata.username}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Palette className="w-5 h-5 text-purple-600" />
                    <h3 className="text-xl font-bold text-foreground">Theme Preference</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {themeOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setTheme(option.id)}
                          className={`p-6 rounded-xl transition-all duration-300 flex flex-col items-center gap-3 ${
                            theme === option.id
                              ? 'bg-primary/10 text-primary border-2 border-primary/30'
                              : 'bg-background border border-border hover:border-primary/30'
                          }`}
                        >
                          <Icon className="w-8 h-8" />
                          <span className="font-semibold">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full h-px bg-border"></div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-foreground">Playback Settings</h3>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-accent transition-all border border-border">
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Auto-play Trailers</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatically play trailers when viewing movie details
                      </p>
                    </div>
                    <button
                      onClick={() => handlePlaybackToggle('autoplayTrailers')}
                      className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${
                        playbackSettings.autoplayTrailers
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                          : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          playbackSettings.autoplayTrailers ? 'transform translate-x-5' : ''
                        }`}
                      ></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-accent transition-all border border-border">
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Show Adult Content</h4>
                      <p className="text-sm text-muted-foreground">
                        Include adult content in search results
                      </p>
                    </div>
                    <button
                      onClick={() => handlePlaybackToggle('showAdultContent')}
                      className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${
                        playbackSettings.showAdultContent
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                          : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          playbackSettings.showAdultContent ? 'transform translate-x-5' : ''
                        }`}
                      ></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <Bell className="w-5 h-5 text-purple-600" />
                  <h3 className="text-xl font-bold text-foreground">Notification Preferences</h3>
                </div>

                {Object.entries({
                  newReleases: {
                    title: 'New Releases',
                    description: 'Get notified about new movie releases',
                    icon: '\uD83C\uDFAC',
                  },
                  recommendations: {
                    title: 'Recommendations',
                    description: 'Receive personalized movie recommendations',
                    icon: '\u2728',
                  },
                  watchlistUpdates: {
                    title: 'Watchlist Updates',
                    description: 'Notifications when watchlist movies become available',
                    icon: '\uD83D\uDCCB',
                  },
                  newsletter: {
                    title: 'Newsletter',
                    description: 'Weekly digest of trending movies and news',
                    icon: '\uD83D\uDCE7',
                  },
                }).map(([key, { title, description, icon }]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-accent transition-all border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{icon}</span>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{title}</h4>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleNotificationChange(key)}
                      className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${
                        notifications[key]
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                          : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          notifications[key] ? 'transform translate-x-5' : ''
                        }`}
                      ></div>
                    </button>
                  </div>
                ))}

                <div className="pt-6">
                  <div className="p-6 rounded-xl bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-600/20">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Stay Updated!</h4>
                        <p className="text-sm text-muted-foreground">
                          Enable notifications to never miss out on the latest movies and personalized recommendations
                          tailored just for you.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
