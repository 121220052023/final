DROP FUNCTION IF EXISTS public.admin_get_deleted_users();

CREATE OR REPLACE FUNCTION public.admin_get_deleted_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  username text,
  full_name text,
  _role text,
  deleted_at timestamptz,
  is_suspended boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.email, p.username, p.full_name, p.role,
    p.deleted_at, COALESCE(p.is_suspended, false)
  FROM public.profiles p
  WHERE p.deleted_at IS NOT NULL
  ORDER BY p.deleted_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_deleted_users TO authenticated;

DROP FUNCTION IF EXISTS public.admin_update_profile;

CREATE OR REPLACE FUNCTION public.admin_update_profile(
  target_user_id uuid,
  updates jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  UPDATE public.profiles
  SET
    role = CASE WHEN updates ? 'role' THEN (updates->>'role')::text ELSE role END,
    is_suspended = CASE WHEN updates ? 'is_suspended' THEN (updates->>'is_suspended')::boolean ELSE is_suspended END,
    suspended_at = CASE WHEN updates ? 'suspended_at' THEN (updates->>'suspended_at')::timestamptz ELSE suspended_at END,
    suspended_reason = CASE WHEN updates ? 'suspended_reason' THEN (updates->>'suspended_reason')::text ELSE suspended_reason END,
    deleted_at = CASE WHEN updates ? 'deleted_at' THEN (updates->>'deleted_at')::timestamptz ELSE deleted_at END
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_profile TO authenticated;
