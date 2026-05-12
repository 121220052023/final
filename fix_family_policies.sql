-- ============================================================
-- Fix family_members policies (safe to re-run)
-- ============================================================

-- Drop all existing family-related policies
DROP POLICY IF EXISTS "Users can view own family member rows" ON public.family_members;
DROP POLICY IF EXISTS "Users can insert family members" ON public.family_members;
DROP POLICY IF EXISTS "Users can view their family groups" ON public.family_groups;
DROP POLICY IF EXISTS "Users can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Parents can insert family members" ON public.family_members;

-- Check what column name family_members uses for the group reference
DO $$
DECLARE
  col_name text;
BEGIN
  -- Find the column name (could be group_id or family_group_id)
  SELECT column_name INTO col_name
  FROM information_schema.columns
  WHERE table_name = 'family_members'
    AND column_name IN ('group_id', 'family_group_id')
  LIMIT 1;

  IF col_name = 'group_id' THEN
    EXECUTE 'CREATE POLICY "Users can view own family member rows" ON public.family_members FOR SELECT USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can insert family members" ON public.family_members FOR INSERT WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can view their family groups" ON public.family_groups FOR SELECT USING (auth.uid() IN (SELECT fm.user_id FROM public.family_members fm WHERE fm.group_id = id))';
  ELSIF col_name = 'family_group_id' THEN
    EXECUTE 'CREATE POLICY "Users can view own family member rows" ON public.family_members FOR SELECT USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can insert family members" ON public.family_members FOR INSERT WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can view their family groups" ON public.family_groups FOR SELECT USING (auth.uid() IN (SELECT fm.user_id FROM public.family_members fm WHERE fm.family_group_id = id))';
  ELSE
    RAISE NOTICE 'family_members table has neither group_id nor family_group_id column';
  END IF;
END;
$$;
