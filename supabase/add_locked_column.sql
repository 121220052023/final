-- Add account_locked column to child_profiles
ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT FALSE;
