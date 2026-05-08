-- ═══════════════════════════════════════════════════════════════
-- Ocean of Movies - Supabase Database Schema
-- Phase 1: Core Tables, RLS Policies, Parental Controls
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. PROFILES ───
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'parent', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 2. WATCHLIST ───
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  movie_id TEXT NOT NULL,
  movie_type TEXT DEFAULT 'movie' CHECK (movie_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_url TEXT,
  year TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movie_id, movie_type)
);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);

-- ─── 3. LIKED MOVIES ───
CREATE TABLE IF NOT EXISTS liked_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  movie_id TEXT NOT NULL,
  movie_type TEXT DEFAULT 'movie' CHECK (movie_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_url TEXT,
  year TEXT,
  liked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movie_id, movie_type)
);
CREATE INDEX IF NOT EXISTS idx_liked_movies_user ON liked_movies(user_id);

-- ─── 4. WATCH HISTORY ───
CREATE TABLE IF NOT EXISTS watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  movie_id TEXT NOT NULL,
  movie_type TEXT DEFAULT 'movie' CHECK (movie_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_url TEXT,
  progress FLOAT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  last_position INT DEFAULT 0,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_watched ON watch_history(watched_at DESC);

-- ─── 5. REVIEWS ───
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  movie_id TEXT NOT NULL,
  movie_type TEXT DEFAULT 'movie' CHECK (movie_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 10),
  content TEXT NOT NULL,
  likes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_movie ON reviews(movie_id, movie_type);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 6. REVIEW LIKES ───
CREATE TABLE IF NOT EXISTS review_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_review_likes_review ON review_likes(review_id);

-- ─── 7. COLLECTIONS ───
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_public BOOLEAN DEFAULT true,
  cover_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);
DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 8. COLLECTION MOVIES ───
CREATE TABLE IF NOT EXISTS collection_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  movie_id TEXT NOT NULL,
  movie_type TEXT DEFAULT 'movie' CHECK (movie_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_url TEXT,
  notes TEXT DEFAULT '',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, movie_id, movie_type)
);
CREATE INDEX IF NOT EXISTS idx_collection_movies_collection ON collection_movies(collection_id);

-- ─── 9. FAMILY GROUPS ───
CREATE TABLE IF NOT EXISTS family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_groups_creator ON family_groups(created_by);

-- ─── 10. FAMILY MEMBERS ───
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_family_members_group ON family_members(group_id);
CREATE INDEX IF NOT EXISTS idx_family_members_role ON family_members(role);

-- ─── 11. PARENTAL SETTINGS ───
CREATE TABLE IF NOT EXISTS parental_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE NOT NULL,
  max_rating TEXT DEFAULT 'PG-13' CHECK (max_rating IN ('G', 'PG', 'PG-13', 'R', 'NC-17')),
  blocked_genres TEXT[] DEFAULT '{}',
  blocked_keywords TEXT[] DEFAULT '{}',
  daily_watch_limit_minutes INT DEFAULT 120 CHECK (daily_watch_limit_minutes >= 0),
  bedtime_start TIME DEFAULT '22:00',
  bedtime_end TIME DEFAULT '07:00',
  require_approval BOOLEAN DEFAULT false,
  block_adult_content BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id)
);
DROP TRIGGER IF EXISTS update_parental_settings_updated_at ON parental_settings;
CREATE TRIGGER update_parental_settings_updated_at BEFORE UPDATE ON parental_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 12. CHILD PROFILES ───
CREATE TABLE IF NOT EXISTS child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE NOT NULL,
  child_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pin TEXT,
  custom_max_rating TEXT CHECK (custom_max_rating IN ('G', 'PG', 'PG-13', 'R', 'NC-17')),
  custom_blocked_genres TEXT[] DEFAULT '{}',
  custom_daily_limit_minutes INT,
  custom_bedtime_start TIME,
  custom_bedtime_end TIME,
  time_used_today INT DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, child_user_id)
);
CREATE INDEX IF NOT EXISTS idx_child_profiles_child ON child_profiles(child_user_id);
DROP TRIGGER IF EXISTS update_child_profiles_updated_at ON child_profiles;
CREATE TRIGGER update_child_profiles_updated_at BEFORE UPDATE ON child_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 13. WATCH REQUESTS ───
CREATE TABLE IF NOT EXISTS watch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE NOT NULL,
  movie_id TEXT NOT NULL,
  movie_type TEXT DEFAULT 'movie' CHECK (movie_type IN ('movie', 'tv')),
  movie_title TEXT NOT NULL,
  movie_poster TEXT,
  movie_year TEXT,
  movie_rating TEXT,
  movie_genre TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  parent_message TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_watch_requests_child ON watch_requests(child_user_id);
CREATE INDEX IF NOT EXISTS idx_watch_requests_group ON watch_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_watch_requests_status ON watch_requests(status);

-- ─── 14. ACTIVITY LOGS ───
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_group ON activity_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- ─── 15. NOTIFICATIONS ───
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('watch_request', 'request_reviewed', 'limit_reached', 'bedtime', 'new_review', 'collection_shared', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE liked_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE parental_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Watchlist policies
DROP POLICY IF EXISTS "Users can view own watchlist" ON watchlist;
CREATE POLICY "Users can view own watchlist" ON watchlist FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can add to own watchlist" ON watchlist;
CREATE POLICY "Users can add to own watchlist" ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove from own watchlist" ON watchlist;
CREATE POLICY "Users can remove from own watchlist" ON watchlist FOR DELETE USING (auth.uid() = user_id);

-- Liked movies policies
DROP POLICY IF EXISTS "Users can view own liked movies" ON liked_movies;
CREATE POLICY "Users can view own liked movies" ON liked_movies FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can like movies" ON liked_movies;
CREATE POLICY "Users can like movies" ON liked_movies FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike movies" ON liked_movies;
CREATE POLICY "Users can unlike movies" ON liked_movies FOR DELETE USING (auth.uid() = user_id);

-- Watch history policies
DROP POLICY IF EXISTS "Users can view own watch history" ON watch_history;
CREATE POLICY "Users can view own watch history" ON watch_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own watch history" ON watch_history;
CREATE POLICY "Users can insert own watch history" ON watch_history FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own watch history" ON watch_history;
CREATE POLICY "Users can update own watch history" ON watch_history FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own watch history" ON watch_history;
CREATE POLICY "Users can delete own watch history" ON watch_history FOR DELETE USING (auth.uid() = user_id);

-- Reviews policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create own reviews" ON reviews;
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Review likes policies
DROP POLICY IF EXISTS "Anyone can view review likes" ON review_likes;
CREATE POLICY "Anyone can view review likes" ON review_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can like reviews" ON review_likes;
CREATE POLICY "Users can like reviews" ON review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike reviews" ON review_likes;
CREATE POLICY "Users can unlike reviews" ON review_likes FOR DELETE USING (auth.uid() = user_id);

-- Collections policies
DROP POLICY IF EXISTS "Anyone can view public collections" ON collections;
CREATE POLICY "Anyone can view public collections" ON collections FOR SELECT USING (is_public = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own collections" ON collections;
CREATE POLICY "Users can create own collections" ON collections FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own collections" ON collections;
CREATE POLICY "Users can update own collections" ON collections FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own collections" ON collections;
CREATE POLICY "Users can delete own collections" ON collections FOR DELETE USING (auth.uid() = user_id);

-- Collection movies policies
DROP POLICY IF EXISTS "Anyone can view public collection movies" ON collection_movies;
CREATE POLICY "Anyone can view public collection movies" ON collection_movies FOR SELECT USING (
  EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_movies.collection_id AND (c.is_public = true OR c.user_id = auth.uid()))
);
DROP POLICY IF EXISTS "Users can add to own collections" ON collection_movies;
CREATE POLICY "Users can add to own collections" ON collection_movies FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_movies.collection_id AND c.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can remove from own collections" ON collection_movies;
CREATE POLICY "Users can remove from own collections" ON collection_movies FOR DELETE USING (
  EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_movies.collection_id AND c.user_id = auth.uid())
);

-- Family groups policies
DROP POLICY IF EXISTS "Members can view their family groups" ON family_groups;
CREATE POLICY "Members can view their family groups" ON family_groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM family_members fm WHERE fm.group_id = family_groups.id AND fm.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can create family groups" ON family_groups;
CREATE POLICY "Users can create family groups" ON family_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Creator can update family group" ON family_groups;
CREATE POLICY "Creator can update family group" ON family_groups FOR UPDATE USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "Creator can delete family group" ON family_groups;
CREATE POLICY "Creator can delete family group" ON family_groups FOR DELETE USING (auth.uid() = created_by);

-- Family members policies
DROP POLICY IF EXISTS "Members can view family members" ON family_members;
CREATE POLICY "Members can view family members" ON family_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM family_members fm WHERE fm.group_id = family_members.group_id AND fm.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Parents can add members" ON family_members;
CREATE POLICY "Parents can add members" ON family_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM family_members fm WHERE fm.group_id = family_members.group_id AND fm.user_id = auth.uid() AND fm.role = 'parent')
);
DROP POLICY IF EXISTS "Parents can remove members" ON family_members;
CREATE POLICY "Parents can remove members" ON family_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM family_members fm WHERE fm.group_id = family_members.group_id AND fm.user_id = auth.uid() AND fm.role = 'parent')
);

-- Parental settings policies
DROP POLICY IF EXISTS "Parents can view parental settings" ON parental_settings;
CREATE POLICY "Parents can view parental settings" ON parental_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM family_members fm WHERE fm.group_id = parental_settings.group_id AND fm.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Parents can manage parental settings" ON parental_settings;
CREATE POLICY "Parents can manage parental settings" ON parental_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM family_members fm WHERE fm.group_id = parental_settings.group_id AND fm.user_id = auth.uid() AND fm.role = 'parent')
);

-- Child profiles policies
DROP POLICY IF EXISTS "Parents can view child profiles" ON child_profiles;
CREATE POLICY "Parents can view child profiles" ON child_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM family_members fm WHERE fm.group_id = child_profiles.group_id AND fm.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Parents can manage child profiles" ON child_profiles;
CREATE POLICY "Parents can manage child profiles" ON child_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM family_members fm WHERE fm.group_id = child_profiles.group_id AND fm.user_id = auth.uid() AND fm.role = 'parent')
);

-- Watch requests policies
DROP POLICY IF EXISTS "Children can view own requests" ON watch_requests;
CREATE POLICY "Children can view own requests" ON watch_requests FOR SELECT USING (auth.uid() = child_user_id);
DROP POLICY IF EXISTS "Parents can view requests for their group" ON watch_requests;
CREATE POLICY "Parents can view requests for their group" ON watch_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM family_members fm WHERE fm.group_id = watch_requests.group_id AND fm.user_id = auth.uid() AND fm.role = 'parent')
);
DROP POLICY IF EXISTS "Children can create requests" ON watch_requests;
CREATE POLICY "Children can create requests" ON watch_requests FOR INSERT WITH CHECK (auth.uid() = child_user_id);
DROP POLICY IF EXISTS "Parents can review requests" ON watch_requests;
CREATE POLICY "Parents can review requests" ON watch_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM family_members fm WHERE fm.group_id = watch_requests.group_id AND fm.user_id = auth.uid() AND fm.role = 'parent')
);

-- Activity logs policies
DROP POLICY IF EXISTS "Users can view own activity" ON activity_logs;
CREATE POLICY "Users can view own activity" ON activity_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Parents can view children activity" ON activity_logs;
CREATE POLICY "Parents can view children activity" ON activity_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM family_members fm WHERE fm.group_id = activity_logs.group_id AND fm.user_id = auth.uid() AND fm.role = 'parent')
);
DROP POLICY IF EXISTS "System can log activity" ON activity_logs;
CREATE POLICY "System can log activity" ON activity_logs FOR INSERT WITH CHECK (true);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_parent(user_uuid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM family_members WHERE user_id = user_uuid AND role = 'parent');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_child(user_uuid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM family_members WHERE user_id = user_uuid AND role = 'child');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_effective_max_rating(child_uuid UUID) RETURNS TEXT AS $$
DECLARE result TEXT;
BEGIN
  SELECT COALESCE(cp.custom_max_rating, ps.max_rating, 'PG-13') INTO result
  FROM child_profiles cp
  JOIN family_groups fg ON fg.id = cp.group_id
  LEFT JOIN parental_settings ps ON ps.group_id = fg.id
  WHERE cp.child_user_id = child_uuid LIMIT 1;
  RETURN COALESCE(result, 'PG-13');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_bedtime(child_uuid UUID) RETURNS BOOLEAN AS $$
DECLARE bedtime_start TIME; bedtime_end TIME; current_time TIME := CURRENT_TIME;
BEGIN
  SELECT COALESCE(cp.custom_bedtime_start, ps.bedtime_start, '22:00'::time),
         COALESCE(cp.custom_bedtime_end, ps.bedtime_end, '07:00'::time)
  INTO bedtime_start, bedtime_end
  FROM child_profiles cp JOIN family_groups fg ON fg.id = cp.group_id
  LEFT JOIN parental_settings ps ON ps.group_id = fg.id
  WHERE cp.child_user_id = child_uuid LIMIT 1;
  IF bedtime_start IS NULL THEN RETURN false; END IF;
  IF bedtime_start > bedtime_end THEN RETURN current_time >= bedtime_start OR current_time <= bedtime_end;
  ELSE RETURN current_time >= bedtime_start AND current_time <= bedtime_end; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_remaining_watch_time(child_uuid UUID) RETURNS BOOLEAN AS $$
DECLARE daily_limit INT; time_used INT;
BEGIN
  SELECT COALESCE(cp.custom_daily_limit_minutes, ps.daily_watch_limit_minutes, 120),
         COALESCE(cp.time_used_today, 0)
  INTO daily_limit, time_used
  FROM child_profiles cp JOIN family_groups fg ON fg.id = cp.group_id
  LEFT JOIN parental_settings ps ON ps.group_id = fg.id
  WHERE cp.child_user_id = child_uuid LIMIT 1;
  RETURN time_used < daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
