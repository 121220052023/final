import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  User, Settings, Bell, Palette, Moon, Sun, Monitor, Sparkles,
  Mail, Edit2, Check, X as XIcon, Camera, Shield, ArrowRight,
  HelpCircle, Users, CreditCard, ExternalLink, Crown, Loader,
  Film, Clock, ChevronRight, CheckCircle2, AlertCircle,
  Music, Star, Gift, TrendingUp, Heart, UserCheck,
  LogOut, Download, Key, Smartphone
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '../context/AuthContext';
import { useParentalControls } from '../context/ParentalControlContext';
import { useNavigate } from 'react-router-dom';
import { settingsService } from '../services/settingsService';
import OnboardingModal from '../components/OnboardingModal';
import InvitationManager from '../components/InvitationManager';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../context/SubscriptionContext';

const Profile = () => {
  const { theme, setTheme } = useTheme();
  const { user, profile: userProfile, updateProfile, uploadAvatar, loading: authLoading } = useAuth();
  const { isParent, isChild, pendingInvitations } = useParentalControls();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [localProfile, setLocalProfile] = useState({ name: '', email: '', avatar: '' });
  const [originalName, setOriginalName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
  const [parentRequestStatus, setParentRequestStatus] = useState(null);
  const { plan, subscription, loading: subLoading, openPortal, isExpired, previousPlan } = useSubscription();

  useEffect(() => {
    if (!user) return
    supabase.from('parent_role_requests').select('status').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setParentRequestStatus(data.status)
    })
  }, [user])

  const handleRequestParentRole = async () => {
    try {
      const { error } = await supabase.from('parent_role_requests').insert({ user_id: user.id })
      if (error) throw error
      setParentRequestStatus('pending')
      toast.success('Parent role request submitted. Admin will review it.')
    } catch (err) {
      toast.error(err.message || 'Failed to submit request')
    }
  }

  const [playbackSettings, setPlaybackSettings] = useState(() => {
    const saved = localStorage.getItem('playbackSettings');
    return saved ? JSON.parse(saved) : {
      autoplayTrailers: true,
    };
  });

  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.get();
        if (data) {
          if (data.age) setUserAge(data.age);
          setPlaybackSettings(prev => ({
            ...prev,
            autoplayTrailers: data.autoplay_trailers ?? prev.autoplayTrailers,
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
      const name = userProfile?.full_name || userProfile?.username || user?.email?.split('@')[0] || 'User';
      const email = userProfile?.email || user?.email || '';
      setLocalProfile({ name, email, avatar: userProfile?.avatar_url || '' });
      setOriginalName(name);
      setTempName(name);
    }
  }, [userProfile, user]);

  if (authLoading || !settingsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading your profile...</p>
        </div>
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
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'billing', label: 'Billing', icon: CreditCard },
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
      toast.success('Name updated successfully!');
    } catch {
      toast.error('Failed to update name');
    } finally {
      setIsSaving(false);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const Toggle = ({ checked, onChange }) => (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        checked
          ? 'bg-gradient-to-r from-primary to-secondary'
          : 'bg-surface-container-high'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );

  const SectionCard = ({ icon: Icon, title, children, className = '' }) => (
    <div className={`rounded-2xl border border-border bg-card/60 p-6 space-y-5 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="page-shell-wide">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <span className="section-label">Account</span>
          <h1 className="display-font mt-3 text-5xl font-bold leading-[0.92] md:text-6xl">
            Your Profile
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground max-w-lg">
            Manage your account settings, preferences, and subscription.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* ── Sidebar ── */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="h-fit"
          >
            <div className="editorial-panel rounded-[2rem] p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary via-secondary to-tertiary p-[3px]">
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                      {localProfile.avatar ? (
                        <img src={localProfile.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
                          {getInitials(localProfile.name)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById('avatarInput').click()}
                    className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
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
                          toast.success('Avatar updated!');
                        } catch {
                          toast.error('Failed to upload avatar');
                        }
                      }
                    }}
                  />
                </div>
                <h2 className="mt-4 text-xl font-bold text-foreground tracking-tight">{localProfile.name || 'User'}</h2>
                <p className="text-sm text-muted-foreground">{localProfile.email}</p>
              </div>

              <div className="mt-6 space-y-1.5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-primary/12 to-secondary/12 text-primary shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                      <span>{tab.label}</span>
                      {activeTab === tab.id && (
                        <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                      )}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {(isChild || pendingInvitations?.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6"
                  >
                    <div className="w-full h-px bg-border mb-4" />
                    <InvitationManager />
                  </motion.div>
                )}
              </AnimatePresence>

              {isParent && (
                <>
                  <div className="w-full h-px bg-border my-4" />
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
              {!isChild && !isParent && userProfile?.role === 'user' && (
                <>
                  <div className="w-full h-px bg-border my-4" />
                  {parentRequestStatus === 'pending' ? (
                    <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <HelpCircle className="w-5 h-5" />
                      <span>Parent role request pending</span>
                    </div>
                  ) : parentRequestStatus === 'approved' ? (
                    <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                      <Shield className="w-5 h-5" />
                      <span>Parent role approved!</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleRequestParentRole}
                      className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                    >
                      <Shield className="w-5 h-5" />
                      <span>Request Parent Role</span>
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.aside>

          {/* ── Main Content ── */}
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="min-h-[500px]"
          >
            {/* ═══ Profile Tab ═══ */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <SectionCard icon={User} title="Profile Information">
                  <div className="space-y-5">
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
                            className="text-input flex-1"
                            placeholder="Enter your name"
                            autoFocus
                          />
                          <button
                            onClick={handleNameSave}
                            disabled={isSaving}
                            className="btn-primary min-w-[44px] min-h-[44px] px-4 py-3 justify-center"
                          >
                            {isSaving ? (
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Check className="w-5 h-5" />
                            )}
                          </button>
                          <button onClick={handleNameCancel} className="btn-secondary min-w-[44px] min-h-[44px] px-4 py-3 justify-center">
                            <XIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="group flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3.5 transition-all hover:border-primary/30">
                          <span className="text-foreground font-medium">{localProfile.name || 'Not set'}</span>
                          <button
                            onClick={handleNameEdit}
                            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        Email Address
                      </label>
                      <div className="flex items-center rounded-xl border border-border bg-background/60 px-4 py-3.5">
                        <span className="text-foreground flex-1">{localProfile.email}</span>
                        <span className="text-xs text-muted-foreground font-medium px-3 py-1 rounded-full bg-muted">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <div className="flex flex-wrap items-center gap-4">
                  {!isChild && (
                    <button
                      onClick={() => setShowOnboarding(true)}
                      className="btn-secondary px-5 py-3"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Retake Preferences Quiz
                    </button>
                  )}
                  {userAge && (
                    <span className="text-sm text-muted-foreground">
                      Age: {userAge} &middot; {userAge >= 18 ? 'Adult account' : 'Under 18 — mature content filtered'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ═══ Preferences Tab ═══ */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <SectionCard icon={Palette} title="Theme">
                  <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((option) => {
                      const Icon = option.icon;
                      const isActive = theme === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setTheme(option.id)}
                          className={`relative flex flex-col items-center gap-2.5 rounded-xl border-2 p-5 transition-all duration-300 ${
                            isActive
                              ? 'border-primary bg-gradient-to-b from-primary/8 to-secondary/8 shadow-sm'
                              : 'border-border bg-background hover:border-primary/30 hover:bg-muted/50'
                          }`}
                        >
                          {isActive && (
                            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                              <Check className="h-3 w-3 text-white" />
                            </span>
                          )}
                          <Icon className={`w-7 h-7 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm font-semibold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </SectionCard>

                <SectionCard icon={Monitor} title="Playback">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-all hover:border-primary/30">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <Film className="w-4.5 h-4.5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">Auto-play Trailers</h4>
                        <p className="text-sm text-muted-foreground/80 mt-0.5">Play trailers when viewing movie details</p>
                      </div>
                    </div>
                    <Toggle
                      checked={playbackSettings.autoplayTrailers}
                      onChange={() => handlePlaybackToggle('autoplayTrailers')}
                    />
                  </div>
                </SectionCard>
              </div>
            )}

            {/* ═══ Billing Tab ═══ */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <SectionCard icon={CreditCard} title="Billing & Subscription">
                  {subLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/8 via-secondary/5 to-tertiary/5 border border-primary/20 p-6">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative flex items-center gap-4">
                          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                            plan === 'free'
                              ? 'bg-muted'
                              : 'bg-gradient-to-br from-primary/15 to-secondary/15'
                          }`}>
                            <Crown className={`w-7 h-7 ${plan === 'free' ? 'text-muted-foreground' : 'text-primary'}`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-xl font-bold text-foreground capitalize">
                              {plan === 'ultimate' ? 'Ultimate' : plan === 'pro' ? 'Pro' : 'Free'}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {isExpired
                                ? `Your ${previousPlan ? `${previousPlan.charAt(0).toUpperCase() + previousPlan.slice(1)} plan` : 'paid plan'} has ended. Renew to keep your benefits.`
                                : plan === 'free'
                                  ? 'You are on the Free plan. Upgrade to unlock premium features.'
                                  : subscription?.cancelAtPeriodEnd
                                    ? 'Your subscription will cancel at the end of the billing period.'
                                    : `Active${subscription?.currentPeriodEnd ? ` until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : ''}.`
                              }
                            </p>
                          </div>
                          {plan !== 'free' && (
                            <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-500 border border-green-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {(subscription?.status || isExpired) && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-xl border border-border bg-background p-4">
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</div>
                            <div className="mt-2 flex items-center gap-2.5">
                              <span className={`flex h-2.5 w-2.5 rounded-full ${
                                isExpired
                                  ? 'bg-red-500'
                                  : subscription.status === 'active' || subscription.status === 'trialing'
                                    ? 'bg-green-500 shadow-sm shadow-green-500/40'
                                    : subscription.status === 'past_due'
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                              }`} />
                              <span className="text-lg font-bold text-foreground capitalize">
                                {isExpired ? 'Expired' : subscription.status}
                              </span>
                            </div>
                          </div>
                          {subscription.currentPeriodEnd && (
                            <div className="rounded-xl border border-border bg-background p-4">
                              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current period ends</div>
                              <div className="mt-2 text-lg font-bold text-foreground">
                                {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 pt-1">
                        {plan !== 'free' && (
                          <button
                            onClick={openPortal}
                            className="btn-primary px-6 py-3"
                          >
                            <CreditCard className="h-4 w-4" />
                            Manage Subscription
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate('/pricing')}
                          className="btn-secondary px-6 py-3"
                        >
                          {plan === 'free' ? (
                            <>
                              <Sparkles className="w-4 h-4" />
                              View Plans
                            </>
                          ) : (
                            'Change Plan'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {/* ═══ Notifications Tab ═══ */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <SectionCard icon={Bell} title="Notification Preferences">
                  <div className="space-y-3">
                    {[
                      { key: 'newReleases', title: 'New Releases', description: 'Get notified about new movie and show releases', icon: Film },
                      { key: 'recommendations', title: 'Recommendations', description: 'Receive personalized movie recommendations', icon: Star },
                      { key: 'watchlistUpdates', title: 'Watchlist Updates', description: 'Updates when watchlist items become available', icon: Heart },
                      { key: 'newsletter', title: 'Newsletter', description: 'Weekly digest of trending movies and news', icon: Mail },
                    ].map(({ key, title, description, icon: Icon }) => (
                      <div
                        key={key}
                        className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-all hover:border-primary/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/8 transition-colors">
                            <Icon className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground text-sm">{title}</h4>
                            <p className="text-sm text-muted-foreground/80 mt-0.5">{description}</p>
                          </div>
                        </div>
                        <Toggle
                          checked={notifications[key]}
                          onChange={() => handleNotificationChange(key)}
                        />
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-secondary/5 to-tertiary/5 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 shrink-0">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-base">Stay in the loop</h4>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        Enable notifications to never miss out on the latest releases and curated recommendations just for you.
                      </p>
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
