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

  // Try executing via pg_dump or raw query
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  })
  
  // Try the SQL endpoint format used by Supabase Studio
  const res2 = await fetch(`${SUPABASE_URL}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  
  if (res2.ok) {
    const data = await res2.json()
    console.log('SQL executed via /sql endpoint:', JSON.stringify(data).slice(0, 200))
    return
  }
  
  const text2 = await res2.text()
  console.log(`/sql endpoint status ${res2.status}: ${text2.slice(0, 200)}`)
  
  // Try the pg endpoint
  const res3 = await fetch(`${SUPABASE_URL}/pg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  
  if (res3.ok) {
    const data = await res3.json()
    console.log('SQL executed via /pg endpoint:', JSON.stringify(data).slice(0, 200))
    return
  }
  
  const text3 = await res3.text()
  console.log(`/pg endpoint status ${res3.status}: ${text3.slice(0, 200)}`)
  
  console.log('Could not execute SQL directly via REST API.')
  console.log('Please open Supabase SQL Editor and run the migration file:')
  console.log('  supabase/add_suspended_until_and_auto_unsuspend.sql')
}

main().catch(console.error)
