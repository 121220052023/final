CREATE OR REPLACE FUNCTION public.admin_permanent_delete(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  calling_user_id uuid;
  calling_role text;
BEGIN
  -- Get the caller's identity
  calling_user_id := auth.uid();

  -- If auth.uid() is null, this might be called by service_role
  IF calling_user_id IS NOT NULL THEN
    SELECT p.role INTO calling_role FROM public.profiles p WHERE p.id = calling_user_id;
    IF calling_role IS NULL OR calling_role != 'admin' THEN
      RAISE EXCEPTION 'Only admins can perform this action';
    END IF;
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_permanent_delete TO authenticated;
