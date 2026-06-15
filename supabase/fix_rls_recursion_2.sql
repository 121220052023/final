DROP POLICY IF EXISTS "Admins can read family members" ON family_members;
CREATE POLICY "Admins can read family members" ON family_members FOR SELECT USING (is_admin());
