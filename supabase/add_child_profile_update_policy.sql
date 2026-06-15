CREATE POLICY "Users can update own child profile"
ON public.child_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
