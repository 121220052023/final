-- Fix child_profiles RLS: infinite recursion from self-referencing family_members

-- Ensure SECURITY DEFINER helper functions exist (from sync_live_schema)
CREATE OR REPLACE FUNCTION public.is_family_parent(group_uuid UUID, user_uuid UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_group_id = group_uuid AND fm.user_id = user_uuid AND fm.role = 'parent'
  );
$$;

-- Drop existing policies on child_profiles
DROP POLICY IF EXISTS "Parents can view child profiles" ON public.child_profiles;
DROP POLICY IF EXISTS "Parents can manage child profiles" ON public.child_profiles;
DROP POLICY IF EXISTS "child_profiles_select_parent" ON public.child_profiles;
DROP POLICY IF EXISTS "child_profiles_upsert_parent" ON public.child_profiles;
DROP POLICY IF EXISTS "child_profiles_update_parent" ON public.child_profiles;
DROP POLICY IF EXISTS "child_profiles_delete_parent" ON public.child_profiles;

-- Recreate using SECURITY DEFINER function
CREATE POLICY "child_profiles_select_parent" ON public.child_profiles
  FOR SELECT USING (public.is_family_parent(group_id, auth.uid()));

CREATE POLICY "child_profiles_upsert_parent" ON public.child_profiles
  FOR INSERT WITH CHECK (public.is_family_parent(group_id, auth.uid()));

CREATE POLICY "child_profiles_update_parent" ON public.child_profiles
  FOR UPDATE USING (public.is_family_parent(group_id, auth.uid()))
  WITH CHECK (public.is_family_parent(group_id, auth.uid()));

CREATE POLICY "child_profiles_delete_parent" ON public.child_profiles
  FOR DELETE USING (public.is_family_parent(group_id, auth.uid()));
