import { supabase } from '../lib/supabase';

const LIMITS = {
  free: 60 * 60,
  pro: 4 * 60 * 60,
  ultimate: Infinity,
};

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getLocalUsage() {
  try {
    const today = getTodayKey();
    const raw = localStorage.getItem(`watch_time_${today}`);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
}

function setLocalUsage(seconds) {
  try {
    const today = getTodayKey();
    localStorage.setItem(`watch_time_${today}`, seconds.toString());
  } catch {}
}

export const watchTimeService = {
  LIMITS,

  getLimit(plan) {
    return LIMITS[plan] || LIMITS.free;
  },

  async getDailyUsage(userId) {
    const local = getLocalUsage();
    if (!userId) return local;
    try {
      const { data } = await supabase
        .from('user_daily_watch_time')
        .select('total_seconds')
        .eq('user_id', userId)
        .eq('date', getTodayKey())
        .maybeSingle();
      const remote = data?.total_seconds || 0;
      const merged = Math.max(local, remote);
      setLocalUsage(merged);
      return merged;
    } catch {
      return local;
    }
  },

  async addWatchTime(userId, seconds) {
    const current = getLocalUsage();
    const updated = current + seconds;
    setLocalUsage(updated);
    if (!userId) return;
    try {
      const today = getTodayKey();
      const { data: existing } = await supabase
        .from('user_daily_watch_time')
        .select('id, total_seconds')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();
      if (existing) {
        await supabase.from('user_daily_watch_time').update({ total_seconds: existing.total_seconds + seconds, updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('user_daily_watch_time').insert({ user_id: userId, date: today, total_seconds: seconds });
      }
    } catch {}
  },

  getRemainingSeconds(plan, used) {
    const limit = this.getLimit(plan);
    return Math.max(0, limit - used);
  },

  getRemainingMinutes(plan, used) {
    const limit = this.getLimit(plan);
    if (limit === Infinity) return Infinity;
    return Math.ceil(this.getRemainingSeconds(plan, used) / 60);
  },

  isLimitReached(plan, used) {
    const limit = this.getLimit(plan);
    return used >= limit;
  },
};
