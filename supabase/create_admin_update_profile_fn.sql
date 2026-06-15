CREATE OR REPLACE FUNCTION public.admin_update_profile(
  target_user_id uuid,
  updates jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  UPDATE public.profiles
  SET
    role = COALESCE((updates->>'role')::text, role),
    is_suspended = COALESCE((updates->>'is_suspended')::boolean, is_suspended),
    suspended_at = CASE WHEN updates ? 'suspended_at' THEN (updates->>'suspended_at')::timestamptz ELSE suspended_at END,
    suspended_reason = COALESCE((updates->>'suspended_reason')::text, suspended_reason),
    deleted_at = CASE WHEN updates ? 'deleted_at' THEN (updates->>'deleted_at')::timestamptz ELSE deleted_at END
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_profile TO authenticated;

-- Also drop the old function since admin_update_profile covers it
DROP FUNCTION IF EXISTS public.admin_soft_delete_user;
