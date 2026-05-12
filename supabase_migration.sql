-- ============================================================
-- Ocean of Movies — Complete Supabase Migration (SAFE TO RE-RUN)
-- ============================================================

-- 1. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
  id                   uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL,
  theme                text DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  autoplay_trailers    boolean DEFAULT true,
  show_adult_content   boolean DEFAULT false,
  notify_new_releases  boolean DEFAULT true,
  notify_recommendations boolean DEFAULT true,
  notify_watchlist     boolean DEFAULT false,
  notify_newsletter    boolean DEFAULT true,
  age                  integer,
  is_adult             boolean DEFAULT true,
  onboarding_completed boolean DEFAULT false,
  preferred_genres     text DEFAULT '[]',
  preferred_types      text DEFAULT '[]',
  updated_at           timestamptz DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_settings_user_id_unique UNIQUE (user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='age') THEN
    ALTER TABLE public.user_settings ADD COLUMN age integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='is_adult') THEN
    ALTER TABLE public.user_settings ADD COLUMN is_adult boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='onboarding_completed') THEN
    ALTER TABLE public.user_settings ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='preferred_genres') THEN
    ALTER TABLE public.user_settings ADD COLUMN preferred_genres text DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_settings' AND column_name='preferred_types') THEN
    ALTER TABLE public.user_settings ADD COLUMN preferred_types text DEFAULT '[]';
  END IF;
END;
$$;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own settings" ON public.user_settings;
CREATE POLICY "Users can read own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. REVIEW LIKES TABLE
CREATE TABLE IF NOT EXISTS public.review_likes (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id  uuid NOT NULL,
  user_id    uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT review_likes_pkey PRIMARY KEY (id),
  CONSTRAINT review_likes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE,
  CONSTRAINT review_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT review_likes_unique UNIQUE (review_id, user_id)
);

ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read review likes" ON public.review_likes;
CREATE POLICY "Anyone can read review likes" ON public.review_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own review likes" ON public.review_likes;
CREATE POLICY "Users can insert own review likes" ON public.review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own review likes" ON public.review_likes;
CREATE POLICY "Users can delete own review likes" ON public.review_likes FOR DELETE USING (auth.uid() = user_id);

-- 3. ADD FOREIGN KEY from reviews → profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_profiles_fkey') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- 4. FAMILY GROUPS (parental controls)
CREATE TABLE IF NOT EXISTS public.family_groups (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT family_groups_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.family_members (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id        uuid NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  role            text DEFAULT 'child' CHECK (role IN ('parent','child')),
  created_at      timestamptz DEFAULT now(),
  CONSTRAINT family_members_pkey PRIMARY KEY (id)
);

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their family groups" ON public.family_groups;
CREATE POLICY "Users can view their family groups" ON public.family_groups FOR SELECT USING (
  auth.uid() IN (SELECT fm.user_id FROM public.family_members fm WHERE fm.family_group_id = id)
);
DROP POLICY IF EXISTS "Users can view family members" ON public.family_members FOR SELECT;
CREATE POLICY "Users can view family members" ON public.family_members FOR SELECT USING (
  auth.uid() IN (SELECT fm2.user_id FROM public.family_members fm2 WHERE fm2.family_group_id = family_members.family_group_id)
);
DROP POLICY IF EXISTS "Parents can insert family members" ON public.family_members;
CREATE POLICY "Parents can insert family members" ON public.family_members FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT fm3.user_id FROM public.family_members fm3 WHERE fm3.family_group_id = family_members.family_group_id AND fm3.role = 'parent')
);

-- 5. RPCs for review likes
CREATE OR REPLACE FUNCTION public.increment_review_likes(review_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER
AS $$ UPDATE public.reviews SET likes = likes + 1 WHERE id = review_id; $$;

CREATE OR REPLACE FUNCTION public.decrement_review_likes(review_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER
AS $$ UPDATE public.reviews SET likes = GREATEST(likes - 1, 0) WHERE id = review_id; $$;

-- 6. UNIQUE CONSTRAINTS for watchlist / liked_movies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watchlist_user_movie_unique') THEN
    ALTER TABLE public.watchlist ADD CONSTRAINT watchlist_user_movie_unique UNIQUE (user_id, movie_id, movie_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'liked_movies_user_movie_unique') THEN
    ALTER TABLE public.liked_movies ADD CONSTRAINT liked_movies_user_movie_unique UNIQUE (user_id, movie_id, movie_type);
  END IF;
END;
$$;

-- 7. STORAGE BUCKET for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
