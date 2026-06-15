-- Fix family_members RLS: infinite recursion + missing child self-join

-- Ensure SECURITY DEFINER helper functions exist
CREATE OR REPLACE FUNCTION public.is_family_member(group_uuid UUID, user_uuid UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_group_id = group_uuid AND fm.user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_parent(group_uuid UUID, user_uuid UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_group_id = group_uuid AND fm.user_id = user_uuid AND fm.role = 'parent'
  );
$$;

-- Drop ALL existing policies on family_members
DROP POLICY IF EXISTS "Members can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Parents can add members" ON public.family_members;
DROP POLICY IF EXISTS "Parents can remove members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can read family members" ON public.family_members;
DROP POLICY IF EXISTS "family_members_select_member" ON public.family_members;
DROP POLICY IF EXISTS "family_members_insert_parent" ON public.family_members;
DROP POLICY IF EXISTS "family_members_update_parent" ON public.family_members;
DROP POLICY IF EXISTS "family_members_delete_self_or_parent" ON public.family_members;

-- Recreate with no recursion + allow child self-join on invite accept
CREATE POLICY "family_members_select_member" ON public.family_members
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_family_member(family_group_id, auth.uid())
  );

CREATE POLICY "family_members_insert_parent" ON public.family_members
  FOR INSERT WITH CHECK (
    public.is_family_parent(family_group_id, auth.uid())
    OR
    (user_id = auth.uid() AND role = 'child')
    OR
    (user_id = auth.uid() AND role = 'parent'
      AND EXISTS (
        SELECT 1 FROM public.family_groups fg
        WHERE fg.id = family_group_id AND fg.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "family_members_update_parent" ON public.family_members
  FOR UPDATE USING (public.is_family_parent(family_group_id, auth.uid()))
  WITH CHECK (public.is_family_parent(family_group_id, auth.uid()));

CREATE POLICY "family_members_delete_self_or_parent" ON public.family_members
  FOR DELETE USING (user_id = auth.uid() OR public.is_family_parent(family_group_id, auth.uid()));
