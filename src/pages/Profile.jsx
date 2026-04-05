import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Settings, Bell, Palette, Moon, Sun, Monitor, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';

const Profile = () => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    name: 'Movie Enthusiast',
    email: 'user@oceanofmovies.com',
    avatar: '',
  });

  const [notifications, setNotifications] = useState({
    newReleases: true,
    recommendations: true,
    watchlistUpdates: false,
    newsletter: true,
  });

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    console.log('Profile updated:', profile);
    alert('Profile updated successfully! 🎉');
  };

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({
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

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold gradient-header bg-clip-text text-transparent mb-3">
          Profile & Settings
        </h1>
        <p className="text-muted-foreground text-lg">Customize your experience</p>
      </motion.div>

      <div className="max-w-4xl mx-auto">
        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                    : 'bg-card text-foreground hover:bg-accent border border-border'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-2xl p-8 shadow-xl border border-border"
          >
            <div className="flex items-center gap-6 mb-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                  {profile.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-card"></div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">{profile.name}</h2>
                <p className="text-muted-foreground">{profile.email}</p>
                <button className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-semibold">
                  Change Avatar
                </button>
              </div>
            </div>

            <div className="w-full h-px bg-border mb-8"></div>

            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:border-purple-600 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:border-purple-600 focus:outline-none transition-all"
                />
              </div>

              <button type="submit" className="btn-primary w-full py-3">
                Save Changes
              </button>
            </form>
          </motion.div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-2xl p-8 shadow-xl border border-border space-y-8"
          >
            <div>
              <div className="flex items-center gap-2 mb-4">
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
                      className={`p-4 rounded-xl transition-all duration-300 flex flex-col items-center gap-2 ${
                        theme === option.id
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                          : 'bg-background border-2 border-border hover:border-purple-600'
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

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-accent transition-all">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Auto-play Trailers</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically play trailers when viewing movie details
                  </p>
                </div>
                <button className="w-12 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center px-1 transition-all">
                  <div className="w-5 h-5 bg-white rounded-full shadow-md transform translate-x-5"></div>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-accent transition-all">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Show Adult Content</h4>
                  <p className="text-sm text-muted-foreground">
                    Include adult content in search results
                  </p>
                </div>
                <button className="w-12 h-6 bg-border rounded-full flex items-center px-1 transition-all">
                  <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-2xl p-8 shadow-xl border border-border space-y-6"
          >
            {Object.entries({
              newReleases: {
                title: 'New Releases',
                description: 'Get notified about new movie releases',
                icon: '🎬',
              },
              recommendations: {
                title: 'Recommendations',
                description: 'Receive personalized movie recommendations',
                icon: '✨',
              },
              watchlistUpdates: {
                title: 'Watchlist Updates',
                description: 'Notifications when watchlist movies become available',
                icon: '📋',
              },
              newsletter: {
                title: 'Newsletter',
                description: 'Weekly digest of trending movies and news',
                icon: '📧',
              },
            }).map(([key, { title, description, icon }]) => (
              <div
                key={key}
                className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-accent transition-all"
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
                      : 'bg-border'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
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
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Profile;
