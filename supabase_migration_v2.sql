-- ============================================================
-- Ocean of Movies — Migration v2: Admin, Plans, Invitations
-- Safe to re-run (uses IF NOT EXISTS / DO blocks)
-- ============================================================

-- 0. Fix profiles: add admin to role CHECK, add is_suspended if missing
DO $$
BEGIN
  -- Drop old constraint if exists and recreate with 'admin'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('user', 'parent', 'child', 'admin'));
  END IF;

  -- Add is_suspended if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_suspended'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_suspended boolean DEFAULT false;
  END IF;

  -- Add suspended_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'suspended_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN suspended_at timestamptz;
  END IF;

  -- Add suspended_reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'suspended_reason'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN suspended_reason text;
  END IF;

  -- Add deleted_at for soft delete
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN deleted_at timestamptz;
  END IF;

  -- Add email column to profiles if missing (for email-based lookups)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
  END IF;
END;
$$;

-- 1. PLANS TABLE
CREATE TABLE IF NOT EXISTS public.plans (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  price_monthly numeric(10,2) DEFAULT 0,
  price_yearly  numeric(10,2) DEFAULT 0,
  max_children  integer DEFAULT 0,
  max_screens   integer DEFAULT 1,
  hd_enabled    boolean DEFAULT true,
  ultra_hd_enabled boolean DEFAULT false,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT plans_pkey PRIMARY KEY (id)
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active plans" ON public.plans;
CREATE POLICY "Anyone can read active plans" ON public.plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins can manage plans" ON public.plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. USER PLANS TABLE
CREATE TABLE IF NOT EXISTS public.user_plans (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id       uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  subscribed_at timestamptz DEFAULT now(),
  expires_at    timestamptz,
  is_active     boolean DEFAULT true,
  auto_renew    boolean DEFAULT true,
  stripe_subscription_id text,
  payment_method text,
  CONSTRAINT user_plans_pkey PRIMARY KEY (id),
  CONSTRAINT user_plans_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own plan" ON public.user_plans;
CREATE POLICY "Users can read own plan" ON public.user_plans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all plans" ON public.user_plans;
CREATE POLICY "Admins can read all plans" ON public.user_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage user plans" ON public.user_plans;
CREATE POLICY "Admins can manage user plans" ON public.user_plans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update user plans" ON public.user_plans;
CREATE POLICY "Admins can update user plans" ON public.user_plans
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. FAMILY INVITATIONS TABLE (email-based child invitations)
CREATE TABLE IF NOT EXISTS public.family_invitations (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  family_group_id uuid NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  parent_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_email     text NOT NULL,
  child_name      text,
  status          text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message         text,
  created_at      timestamptz DEFAULT now(),
  responded_at    timestamptz,
  expires_at      timestamptz DEFAULT (now() + interval '7 days'),
  CONSTRAINT family_invitations_pkey PRIMARY KEY (id)
);

ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can manage invitations" ON public.family_invitations;
CREATE POLICY "Parents can manage invitations" ON public.family_invitations
  FOR ALL USING (
    auth.uid() = parent_id
  );

DROP POLICY IF EXISTS "Users can see their invitations" ON public.family_invitations;
CREATE POLICY "Users can see their invitations" ON public.family_invitations
  FOR SELECT USING (
    child_email = auth.email() OR auth.uid() = parent_id
  );

DROP POLICY IF EXISTS "Users can accept their invitations" ON public.family_invitations;
CREATE POLICY "Users can accept their invitations" ON public.family_invitations
  FOR UPDATE USING (
    child_email = auth.email()
  );

-- 4. INSERT DEFAULT PLANS
INSERT INTO public.plans (name, description, price_monthly, price_yearly, max_children, max_screens, hd_enabled, ultra_hd_enabled, is_active)
VALUES
  ('Free', 'Basic access with limited features', 0, 0, 0, 1, true, false, true),
  ('Basic', 'HD streaming on 1 screen', 9.99, 99.99, 1, 1, true, false, true),
  ('Standard', 'HD streaming on 2 screens', 14.99, 149.99, 3, 2, true, true, true),
  ('Premium', 'Ultra HD on 4 screens + family', 22.99, 229.99, 6, 4, true, true, true)
ON CONFLICT DO NOTHING;

-- 5. RLS: Admin can read/write ALL profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 6. Admin can read all family data
DROP POLICY IF EXISTS "Admins can read family groups" ON public.family_groups;
CREATE POLICY "Admins can read family groups" ON public.family_groups
  FOR SELECT USING (
    auth.uid() IN (SELECT fm.user_id FROM public.family_members fm WHERE fm.family_group_id = id) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can read family members" ON public.family_members;
CREATE POLICY "Admins can read family members" ON public.family_members
  FOR SELECT USING (
    auth.uid() IN (SELECT fm2.user_id FROM public.family_members fm2 WHERE fm2.family_group_id = family_members.family_group_id) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 7. Admin can read all watch history
DROP POLICY IF EXISTS "Admins can read watch history" ON public.watch_history;
CREATE POLICY "Admins can read watch history" ON public.watch_history
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 8. Admin can read all activity logs
DROP POLICY IF EXISTS "Admins can read activity logs" ON public.activity_logs;
CREATE POLICY "Admins can read activity logs" ON public.activity_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT fm.user_id FROM public.family_members fm WHERE fm.family_group_id = activity_logs.group_id) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 9. Admin can read all notifications
DROP POLICY IF EXISTS "Admins can read notifications" ON public.notifications;
CREATE POLICY "Admins can read notifications" ON public.notifications
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 10. RPC to get user by email (for admin lookups)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(target_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = target_email LIMIT 1;
$$;

-- 11. RPC to get all users with their profiles (admin only)
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
  plan_name text,
  plan_status boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.email,
    p.username,
    p.full_name,
    p.role,
    p.avatar_url,
    COALESCE(p.is_suspended, false) AS is_suspended,
    p.suspended_at,
    p.suspended_reason,
    p.created_at,
    pl.name AS plan_name,
    up.is_active AS plan_status
  FROM public.profiles p
  LEFT JOIN public.user_plans up ON up.user_id = p.id
  LEFT JOIN public.plans pl ON pl.id = up.plan_id
  WHERE p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
$$;

-- 12. RPC to accept a family invitation
CREATE OR REPLACE FUNCTION public.accept_family_invitation(
  p_invitation_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM public.family_invitations
  WHERE id = p_invitation_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already responded to';
  END IF;

  -- Verify the user matches the invited email
  IF v_invitation.child_email != (SELECT email FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'This invitation is not for you';
  END IF;

  -- Update invitation status
  UPDATE public.family_invitations
  SET status = 'accepted', responded_at = now()
  WHERE id = p_invitation_id;

  -- Add to family_members
  INSERT INTO public.family_members (family_group_id, user_id, role)
  VALUES (v_invitation.family_group_id, p_user_id, 'child');

  -- Update profile role to 'child'
  UPDATE public.profiles
  SET role = 'child'
  WHERE id = p_user_id;
END;
$$;

-- 13. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_family_invitation TO authenticated;

-- 14. Fix the family_members column name consistency
DO $$
BEGIN
  -- Check if family_members has 'group_id' instead of 'family_group_id'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'group_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'family_group_id'
  ) THEN
    ALTER TABLE public.family_members RENAME COLUMN group_id TO family_group_id;
  END IF;
END;
$$;
