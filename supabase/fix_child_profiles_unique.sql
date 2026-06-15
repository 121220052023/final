-- Fix child_profiles: add family_group_id and correct unique constraint

-- Add missing column
ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE;

-- Drop wrong unique constraint
ALTER TABLE public.child_profiles
  DROP CONSTRAINT IF EXISTS child_profiles_user_unique;

-- Add correct composite unique constraint
ALTER TABLE public.child_profiles
  ADD CONSTRAINT child_profiles_group_user_unique UNIQUE (family_group_id, user_id);

-- Update existing rows if needed (they belong to the user's primary family group)
UPDATE public.child_profiles cp
SET family_group_id = fm.family_group_id
FROM public.family_members fm
WHERE fm.user_id = cp.user_id
  AND cp.family_group_id IS NULL;
