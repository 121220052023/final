import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { User, Settings, Bell, Palette, Moon, Sun, Monitor, Sparkles, Mail, Edit2, Check, X as XIcon, Camera, Shield, ArrowRight, HelpCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '../context/AuthContext';
import { useParentalControls } from '../context/ParentalControlContext';
import { useNavigate } from 'react-router-dom';
import { settingsService } from '../services/settingsService';
import OnboardingModal from '../components/OnboardingModal';

const Profile = () => {
  const { theme, setTheme } = useTheme();
  const { user, profile: userProfile, updateProfile, uploadAvatar, loading: authLoading } = useAuth();
  const { isParent } = useParentalControls();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [localProfile, setLocalProfile] = useState({ name: '', email: '', avatar: '' });
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

  const [userAge, setUserAge] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [playbackSettings, setPlaybackSettings] = useState(() => {
    const saved = localStorage.getItem('playbackSettings');
    return saved ? JSON.parse(saved) : {
      autoplayTrailers: true,
      showAdultContent: false,
    };
  });

  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, [setTheme]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.get();
        if (data) {
          if (data.theme) setTheme(data.theme);
          if (data.age) setUserAge(data.age);
          setPlaybackSettings(prev => ({
            ...prev,
            autoplayTrailers: data.autoplay_trailers ?? prev.autoplayTrailers,
            showAdultContent: data.show_adult_content ?? prev.showAdultContent,
          }));
          setNotifications(prev => ({
            ...prev,
            newReleases: data.notify_new_releases ?? prev.newReleases,
            recommendations: data.notify_recommendations ?? prev.recommendations,
            watchlistUpdates: data.notify_watchlist ?? prev.watchlistUpdates,
            newsletter: data.notify_newsletter ?? prev.newsletter,
          }));
        }
      } catch {
        // Use defaults
      } finally {
        setSettingsLoaded(true);
      }
    };
    if (user) loadSettings();
    else setSettingsLoaded(true);
  }, [user, setTheme]);

  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { type: 'notifications', value: notifications } }));
    if (user && settingsLoaded) {
      settingsService.upsert({
        notify_new_releases: notifications.newReleases,
        notify_recommendations: notifications.recommendations,
        notify_watchlist: notifications.watchlistUpdates,
        notify_newsletter: notifications.newsletter,
      }).catch(() => {});
    }
  }, [notifications, user, settingsLoaded]);

  useEffect(() => {
    localStorage.setItem('playbackSettings', JSON.stringify(playbackSettings));
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { type: 'playback', value: playbackSettings } }));
    if (user && settingsLoaded) {
      settingsService.upsert({
        autoplay_trailers: playbackSettings.autoplayTrailers,
        show_adult_content: playbackSettings.showAdultContent,
      }).catch(() => {});
    }
  }, [playbackSettings, user, settingsLoaded]);

  useEffect(() => {
    if (user && settingsLoaded) {
      settingsService.upsert({ theme }).catch(() => {});
    }
  }, [theme, user, settingsLoaded]);

  useEffect(() => {
    if (userProfile || user) {
      const name = userProfile?.full_name || userProfile?.username || user?.email?.split('@')[0] || '';
      const email = userProfile?.email || user?.email || '';
      setLocalProfile({ name, email, avatar: userProfile?.avatar_url || '' });
      setOriginalName(name);
      setTempName(name);
    }
  }, [userProfile, user]);

  if (authLoading || !settingsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePlaybackToggle = (key) => {
    setPlaybackSettings(prev => ({ ...prev, [key]: !prev[key] }));
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
      await updateProfile({ full_name: tempName.trim() });
      setLocalProfile({ ...localProfile, name: tempName.trim() });
      setOriginalName(tempName.trim());
      setIsEditingName(false);
      setSaveMessage({ type: 'success', text: 'Name updated successfully!' });
      toast.success('Name updated successfully!');
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to update name' });
      toast.error('Failed to update name');
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
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="editorial-panel rounded-[2rem] p-6 h-fit"
          >
            <div className="flex flex-col items-center text-center mb-6">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
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
                        toast.success('Avatar updated!');
                      } catch (error) {
                        console.error('Error uploading avatar:', error);
                        setSaveMessage({ type: 'error', text: 'Failed to upload avatar' });
                        toast.error('Failed to upload avatar');
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

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="editorial-panel rounded-[2rem] p-6 sm:p-8"
          >
            {activeTab === 'profile' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <User className="w-5 h-5 text-primary" />
                     <h3 className="text-xl font-bold text-foreground">Profile Information</h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Display Name</label>
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
                          <button onClick={handleNameCancel} className="btn-secondary px-4 py-3 rounded-xl">
                            <XIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-background border border-border">
                          <span className="text-foreground">{localProfile.name || 'Not set'}</span>
                          <button
                            onClick={handleNameEdit}
                            className="text-primary hover:text-primary/80 font-semibold flex items-center gap-2 text-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>

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

                    {user?.user_metadata?.username && (
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">Username</label>
                        <div className="px-4 py-3 rounded-xl bg-background border border-border text-foreground">
                          @{user.user_metadata.username}
                        </div>
                      </div>
                     )}
                   </div>

                   <div className="pt-6 border-t border-border">
                     <button
                       onClick={() => setShowOnboarding(true)}
                       className="btn-secondary w-full justify-center gap-2 py-3"
                     >
                       <HelpCircle className="w-4 h-4" />
                       Retake Preferences Quiz
                     </button>
                     {userAge && (
                       <p className="text-xs text-muted-foreground mt-2 text-center">
                         Age on profile: {userAge} ({userAge >= 18 ? 'Adult' : 'Under 18 — mature content filtered'})
                       </p>
                     )}
                   </div>
                 </div>
               </div>
             )}

            {activeTab === 'preferences' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                     <Palette className="w-5 h-5 text-primary" />
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
                      <p className="text-sm text-muted-foreground">Automatically play trailers when viewing movie details</p>
                    </div>
                    <button
                      onClick={() => handlePlaybackToggle('autoplayTrailers')}
                      className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${
                         playbackSettings.autoplayTrailers ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-muted'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${playbackSettings.autoplayTrailers ? 'transform translate-x-5' : ''}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-accent transition-all border border-border">
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Show Adult Content</h4>
                      <p className="text-sm text-muted-foreground">Include adult content in search results</p>
                    </div>
                    <button
                      onClick={() => handlePlaybackToggle('showAdultContent')}
                      className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${
                         playbackSettings.showAdultContent ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-muted'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${playbackSettings.showAdultContent ? 'transform translate-x-5' : ''}`}></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                   <Bell className="w-5 h-5 text-primary" />
                   <h3 className="text-xl font-bold text-foreground">Notification Preferences</h3>
                </div>

                {Object.entries({
                  newReleases: { title: 'New Releases', description: 'Get notified about new movie releases', icon: '\uD83C\uDFAC' },
                  recommendations: { title: 'Recommendations', description: 'Receive personalized movie recommendations', icon: '\u2728' },
                  watchlistUpdates: { title: 'Watchlist Updates', description: 'Notifications when watchlist movies become available', icon: '\uD83D\uDCCB' },
                  newsletter: { title: 'Newsletter', description: 'Weekly digest of trending movies and news', icon: '\uD83D\uDCE7' },
                }).map(([key, { title, description, icon }]) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-accent transition-all border border-border">
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
                         notifications[key] ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-muted'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${notifications[key] ? 'transform translate-x-5' : ''}`}></div>
                    </button>
                  </div>
                ))}

                <div className="pt-6">
                   <div className="p-6 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                     <div className="flex items-start gap-3">
                       <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Stay Updated!</h4>
                        <p className="text-sm text-muted-foreground">
                          Enable notifications to never miss out on the latest movies and personalized recommendations tailored just for you.
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
      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} isFirstTime={false} />
      )}
    </div>
  );
};

export default Profile;
