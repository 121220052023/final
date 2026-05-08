import { useState, useEffect } from 'react';

export function usePlaybackSettings() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('playbackSettings');
    return saved ? JSON.parse(saved) : {
      autoplayTrailers: true,
      showAdultContent: false,
    };
  });

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail?.type === 'playback') setSettings(e.detail.value);
    };
    const handleStorage = () => {
      const saved = localStorage.getItem('playbackSettings');
      if (saved) setSettings(JSON.parse(saved));
    };
    window.addEventListener('settingsChanged', handleUpdate);
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 1000);
    return () => {
      window.removeEventListener('settingsChanged', handleUpdate);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  return settings;
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('notificationSettings');
    return saved ? JSON.parse(saved) : {
      newReleases: true,
      recommendations: true,
      watchlistUpdates: false,
      newsletter: true,
    };
  });

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail?.type === 'notifications') setSettings(e.detail.value);
    };
    const handleStorage = () => {
      const saved = localStorage.getItem('notificationSettings');
      if (saved) setSettings(JSON.parse(saved));
    };
    window.addEventListener('settingsChanged', handleUpdate);
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 1000);
    return () => {
      window.removeEventListener('settingsChanged', handleUpdate);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  return settings;
}
