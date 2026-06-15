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
    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const errors = []

    // Delete related records that have FK constraints
    const { error: settingsError } = await supabase.from('user_settings').delete().eq('user_id', user_id)
    if (settingsError && !settingsError.message?.includes('relation')) errors.push(`user_settings: ${settingsError.message}`)

    // Delete profile
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', user_id)
    if (profileError) errors.push(`profiles: ${profileError.message}`)

    // Delete auth user via RPC (bypasses GoTrue API issues)
    const { error: authError } = await supabase.rpc('admin_permanent_delete', { target_user_id: user_id })
    if (authError) {
      errors.push(`auth: ${authError.message}`)
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: errors.join('; ') }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: `Unexpected: ${err.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
