-- 1. Site settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name text DEFAULT 'Ocean of Movies',
  site_description text DEFAULT 'Discovery, watch later, and personal taste in one place',
  maintenance_mode boolean DEFAULT false,
  allow_new_signups boolean DEFAULT true,
  require_email_verification boolean DEFAULT true,
  default_user_role text DEFAULT 'user',
  max_free_watch_minutes integer DEFAULT 120,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Insert default row
INSERT INTO public.site_settings (site_name) VALUES ('Ocean of Movies')
ON CONFLICT DO NOTHING;

-- 2. Books table
CREATE TABLE IF NOT EXISTS public.books (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  author text,
  description text,
  isbn text,
  page_count integer,
  published_date text,
  publisher text,
  categories text[],
  cover_url text,
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view books"
  ON public.books FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert books"
  ON public.books FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update books"
  ON public.books FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete books"
  ON public.books FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Parent role requests table
CREATE TABLE IF NOT EXISTS public.parent_role_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.parent_role_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
  ON public.parent_role_requests FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create own requests"
  ON public.parent_role_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update requests"
  ON public.parent_role_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Add books read tracking for users
CREATE TABLE IF NOT EXISTS public.read_books (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  book_id uuid REFERENCES public.books(id) NOT NULL,
  progress integer DEFAULT 0,
  finished boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book_id)
);

ALTER TABLE public.read_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own read books"
  ON public.read_books FOR ALL
  USING (auth.uid() = user_id);

-- 5. Add max_watch_count to child_profiles
ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS max_watch_count integer DEFAULT -1;
