import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async (userId) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data && isMounted) {
        setProfile(data);
      }
      return data;
    };

    const fetchOnboarding = async (userId) => {
      try {
        const { data } = await supabase
          .from('user_settings')
          .select('onboarding_completed')
          .eq('user_id', userId)
          .single();
        setNeedsOnboarding(!data?.onboarding_completed);
      } catch {
        setNeedsOnboarding(true);
      }
    };

    // Initial session check — only this gates the loading spinner
    supabase.auth.getSession()
      .then(async ({ data: { session: s }, error }) => {
        if (error) {
          setUser(null);
          setSession(null);
        } else if (s?.user) {
          setUser(s.user);
          setSession(s);
          await fetchProfile(s.user.id).catch(() => {});
          fetchOnboarding(s.user.id);
        }
        if (isMounted) setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    // Subsequent auth changes (login/logout) — update state without touching loading
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (s?.user) {
        setUser(s.user);
        setSession(s);
        fetchProfile(s.user.id).catch(() => {});
        if (event === 'SIGNED_IN') {
          fetchOnboarding(s.user.id);
        }
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
        setNeedsOnboarding(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async ({ email, password, username, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName || null },
      },
    });
    if (error) throw error;

    if (data?.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username,
          full_name: fullName || null,
          email: data.user.email,
        });
      } catch (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    return data;
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  };

  const signInWithGitHub = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    setUser(null);
    setProfile(null);
    setSession(null);
    setNeedsOnboarding(false);
    setLoading(false);
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in');
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  };

  const uploadAvatar = async (file) => {
    if (!user) throw new Error('No user logged in');
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    await updateProfile({ avatar_url: publicUrl });
    return publicUrl;
  };

  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  const isAdmin = profile?.role === 'admin';

  const value = {
    user,
    session,
    profile,
    loading,
    needsOnboarding,
    isAdmin,
    signUp,
    signIn,
    resetPassword,
    updatePassword,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
    updateProfile,
    uploadAvatar,
    completeOnboarding,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
