CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
  display_name TEXT;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  base_username := LOWER(REGEXP_REPLACE(base_username, '[^a-zA-Z0-9_]', '_', 'g'));
  -- Ensure first character is a letter
  IF base_username ~ '^[^a-z]' THEN
    base_username := 'u' || base_username;
  END IF;
  base_username := LEFT(base_username, 20);
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := LEFT(base_username, 17) || suffix;
  END LOOP;

  display_name := NEW.raw_user_meta_data->>'full_name';

  INSERT INTO profiles (id, username, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    final_username,
    display_name,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NEW.email
  );

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{full_name}',
    to_jsonb(display_name)
  )
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;
