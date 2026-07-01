const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://jqsoyffbqwiyggsvlfzk.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxc295ZmZicXdpeWdnc3ZsZnprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU2MTMzNCwiZXhwIjoyMDkxMTM3MzM0fQ.DRwPV-Hd-sc-SLl1rqPAoTXfkBsBHpPd545IEmVyVbc'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const sql = `
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

DROP FUNCTION IF EXISTS public.get_all_users();

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
  suspended_until timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  plan_name text,
  plan_status boolean,
  total_watch_time bigint,
  liked_count bigint,
  watch_history_count bigint,
  review_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET is_suspended = false, suspended_until = null, suspended_reason = null
  WHERE is_suspended = true AND suspended_until IS NOT NULL AND suspended_until < now();

  RETURN QUERY
  SELECT
    p.id, p.email, p.username, p.full_name, p.role, p.avatar_url,
    COALESCE(p.is_suspended, false), p.suspended_at, p.suspended_reason, p.suspended_until,
    p.created_at, au.last_sign_in_at,
    pl.name, up.is_active,
    COALESCE((SELECT SUM(wh.progress)::bigint FROM public.watch_history wh WHERE wh.user_id = p.id), 0),
    COALESCE((SELECT COUNT(*)::bigint FROM public.liked_movies lm WHERE lm.user_id = p.id), 0),
    COALESCE((SELECT COUNT(*)::bigint FROM public.watch_history wh WHERE wh.user_id = p.id), 0),
    COALESCE((SELECT COUNT(*)::bigint FROM public.reviews r WHERE r.user_id = p.id), 0)
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.user_plans up ON up.user_id = p.id
  LEFT JOIN public.plans pl ON pl.id = up.plan_id
  WHERE p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users TO authenticated;
`

async function main() {
  console.log('Running SQL migration...')

  const { error } = await supabase.rpc('exec_sql', { sql_text: sql })
  if (error) {
    console.log('exec_sql RPC not available, trying direct SQL...')
    const { error: e2 } = await supabase.from('_exec_sql').insert({ query: sql }).single().maybeSingle()
    if (e2) {
      console.log('Insert approach failed:', e2.message)
      console.log('Trying management API...')
      const res = await fetch(`https://api.supabase.com/v1/projects/jqsoyffbqwiyggsvlfzk/database/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      })
      const text = await res.text()
      console.log(`Status ${res.status}: ${text}`)
    } else {
      console.log('SQL executed successfully!')
    }
  } else {
    console.log('SQL executed successfully!')
  }
}

main().catch(console.error)
