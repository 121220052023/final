-- ============================================================
-- Fix family_members 500 error and reviews 406 error
-- Run this entire block in Supabase SQL Editor
-- ============================================================

-- 1. Drop all existing family-related policies (the ones causing infinite recursion)
DROP POLICY IF EXISTS "Users can view own family member rows" ON public.family_members;
DROP POLICY IF EXISTS "Users can insert family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can view their family groups" ON public.family_groups;
DROP POLICY IF EXISTS "Users can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Parents can insert family members" ON public.family_members;

-- 2. Create simple policies that don't cause recursion
CREATE POLICY "Users can view own family member rows" ON public.family_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert family members" ON public.family_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their family groups" ON public.family_groups FOR SELECT USING (true);

-- 3. Remove the reviews_profiles_fkey constraint that causes 406 errors
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_profiles_fkey;

-- 4. Also drop family_groups policies if they exist
DROP POLICY IF EXISTS "Family members can view their groups" ON public.family_groups;
