-- Add last_sign_in_at to get_all_users function
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS public.get_all_users();

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  username text,
  full_name text,
  role text,
  avatar_url text,
  is_suspended boolean,
  suspended_at timestamptz,
  suspended_reason text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  plan_name text,
  plan_status boolean,
  total_watch_time bigint,
  liked_count bigint,
  watch_history_count bigint,
  review_count bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id, p.email, p.username, p.full_name, p.role, p.avatar_url,
    COALESCE(p.is_suspended, false), p.suspended_at, p.suspended_reason, p.created_at,
    au.last_sign_in_at,
    pl.name, up.is_active,
    COALESCE((SELECT SUM(wh.progress)::bigint FROM public.watch_history wh WHERE wh.user_id = p.id), 0),
    COALESCE((SELECT COUNT(*)::bigint FROM public.liked_movies lm WHERE lm.user_id = p.id), 0),
    COALESCE((SELECT COUNT(*)::bigint FROM public.watch_history wh WHERE wh.user_id = p.id), 0),
    COALESCE((SELECT COUNT(*)::bigint FROM public.reviews r WHERE r.user_id = p.id), 0)
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.user_plans up ON up.user_id = p.id
  LEFT JOIN public.plans pl ON pl.id = up.plan_id
  WHERE p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
$$;
