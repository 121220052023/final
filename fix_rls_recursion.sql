-- Run this entire script in Supabase SQL Editor

-- Drop old get_all_users first (return type changed)
DROP FUNCTION IF EXISTS public.get_all_users();

-- 1. Create admin check function (bypasses RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'); $$;

-- 2. Fix profiles RLS policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- 3. Fix other table policies
DROP POLICY IF EXISTS "Admins can read family groups" ON public.family_groups;
CREATE POLICY "Admins can read family groups" ON public.family_groups
  FOR SELECT USING (auth.uid() IN (SELECT fm.user_id FROM public.family_members fm WHERE fm.family_group_id = id) OR public.is_admin());

DROP POLICY IF EXISTS "Admins can read family members" ON public.family_members;
CREATE POLICY "Admins can read family members" ON public.family_members
  FOR SELECT USING (auth.uid() IN (SELECT fm2.user_id FROM public.family_members fm2 WHERE fm2.family_group_id = family_members.family_group_id) OR public.is_admin());

DROP POLICY IF EXISTS "Admins can read watch history" ON public.watch_history;
CREATE POLICY "Admins can read watch history" ON public.watch_history
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can read activity logs" ON public.activity_logs;
CREATE POLICY "Admins can read activity logs" ON public.activity_logs
  FOR SELECT USING (auth.uid() IN (SELECT fm.user_id FROM public.family_members fm WHERE fm.family_group_id = activity_logs.group_id) OR public.is_admin());

DROP POLICY IF EXISTS "Admins can read notifications" ON public.notifications;
CREATE POLICY "Admins can read notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins can manage plans" ON public.plans FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all plans" ON public.user_plans;
CREATE POLICY "Admins can read all plans" ON public.user_plans FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage user plans" ON public.user_plans;
CREATE POLICY "Admins can manage user plans" ON public.user_plans FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update user plans" ON public.user_plans;
CREATE POLICY "Admins can update user plans" ON public.user_plans FOR UPDATE USING (public.is_admin());

-- 4. Hard delete function (admin only)
CREATE OR REPLACE FUNCTION public.hard_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins can delete users'; END IF;
  DELETE FROM public.user_settings WHERE user_id = p_user_id;
  DELETE FROM public.user_plans WHERE user_id = p_user_id;
  DELETE FROM public.family_invitations WHERE parent_id = p_user_id;
  DELETE FROM public.family_members WHERE user_id = p_user_id;
  DELETE FROM public.child_profiles WHERE user_id = p_user_id;
  DELETE FROM public.watch_requests WHERE child_user_id = p_user_id;
  DELETE FROM public.watch_history WHERE user_id = p_user_id;
  DELETE FROM public.watchlist WHERE user_id = p_user_id;
  DELETE FROM public.liked_movies WHERE user_id = p_user_id;
  DELETE FROM public.reviews WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.activity_logs WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.hard_delete_user TO authenticated;

-- 5. Updated get_all_users with watch time, likes, reviews
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (user_id uuid, email text, username text, full_name text, role text, avatar_url text, is_suspended boolean, suspended_at timestamptz, suspended_reason text, created_at timestamptz, plan_name text, plan_status boolean, total_watch_time bigint, liked_count bigint, watch_history_count bigint, review_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id, p.email, p.username, p.full_name, p.role, p.avatar_url,
    COALESCE(p.is_suspended, false), p.suspended_at, p.suspended_reason, p.created_at,
    pl.name, up.is_active,
    COALESCE((SELECT SUM(wh.progress)::bigint FROM public.watch_history wh WHERE wh.user_id = p.id), 0),
    COALESCE((SELECT COUNT(*)::bigint FROM public.liked_movies lm WHERE lm.user_id = p.id), 0),
    COALESCE((SELECT COUNT(*)::bigint FROM public.watch_history wh WHERE wh.user_id = p.id), 0),
    COALESCE((SELECT COUNT(*)::bigint FROM public.reviews r WHERE r.user_id = p.id), 0)
  FROM public.profiles p
  LEFT JOIN public.user_plans up ON up.user_id = p.id
  LEFT JOIN public.plans pl ON pl.id = up.plan_id
  WHERE p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
$$;
