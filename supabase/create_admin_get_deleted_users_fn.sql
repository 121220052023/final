CREATE OR REPLACE FUNCTION public.admin_get_deleted_users()
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  full_name text,
  role text,
  deleted_at timestamptz,
  is_suspended boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.username, p.full_name, p.role, p.deleted_at, COALESCE(p.is_suspended, false)
  FROM public.profiles p
  WHERE p.deleted_at IS NOT NULL
  ORDER BY p.deleted_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_deleted_users TO authenticated;
