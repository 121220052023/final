-- Add missing columns to child_profiles
ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS custom_blocked_genres TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_max_rating TEXT CHECK (custom_max_rating IN ('G', 'PG', 'PG-13', 'R', 'NC-17')),
  ADD COLUMN IF NOT EXISTS custom_daily_limit_minutes INT,
  ADD COLUMN IF NOT EXISTS custom_bedtime_start TIME,
  ADD COLUMN IF NOT EXISTS custom_bedtime_end TIME,
  ADD COLUMN IF NOT EXISTS pin TEXT;
