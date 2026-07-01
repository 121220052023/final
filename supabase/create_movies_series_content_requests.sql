-- 1. Movies table
CREATE TABLE IF NOT EXISTS public.movies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  release_year text,
  genres text[],
  poster_url text,
  rating text,
  runtime integer,
  director text,
  cast_list text[],
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view movies"
  ON public.movies FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert movies"
  ON public.movies FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update movies"
  ON public.movies FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete movies"
  ON public.movies FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Series table
CREATE TABLE IF NOT EXISTS public.series (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  start_year text,
  end_year text,
  genres text[],
  poster_url text,
  rating text,
  seasons integer,
  episodes integer,
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view series"
  ON public.series FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert series"
  ON public.series FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update series"
  ON public.series FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete series"
  ON public.series FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Content requests table (users can request new content)
CREATE TABLE IF NOT EXISTS public.content_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('movie', 'series', 'book')),
  title text NOT NULL,
  description text,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.content_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
  ON public.content_requests FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create requests"
  ON public.content_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update requests"
  ON public.content_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete requests"
  ON public.content_requests FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
