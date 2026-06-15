-- Allow admins to SELECT any user's watch_history
CREATE POLICY "admins_select_watch_history"
ON public.watch_history
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow admins to DELETE any user's watch_history
CREATE POLICY "admins_delete_watch_history"
ON public.watch_history
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow admins to SELECT any user's liked_movies
CREATE POLICY "admins_select_liked_movies"
ON public.liked_movies
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow admins to DELETE any user's liked_movies
CREATE POLICY "admins_delete_liked_movies"
ON public.liked_movies
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow admins to DELETE any user's reviews
CREATE POLICY "admins_delete_reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
