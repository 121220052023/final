import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { email, password, role, full_name } = await req.json()
    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: 'email, password, and role required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || '', email },
    })
    if (createError) throw createError

    let baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 20)
    if (!/^[a-z]/.test(baseUsername)) baseUsername = 'u' + baseUsername
    let username = baseUsername
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle()
      if (!existing) break
      attempts++
      username = baseUsername + attempts
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authUser.user.id, email, full_name: full_name || '', role, username,
    }, { onConflict: 'id' })
    if (profileError) throw profileError

    return new Response(JSON.stringify({ success: true, user: authUser.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
