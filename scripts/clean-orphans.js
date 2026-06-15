import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env'), 'utf-8').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function cleanOrphans() {
  // Find auth users that have no profile (orphans)
  const { data: users } = await supabase.auth.admin.listUsers();
  const orphans = [];

  for (const u of users?.users || []) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', u.id)
      .maybeSingle();
    if (!profile) {
      orphans.push(u);
    }
  }

  console.log(`Found ${orphans.length} orphaned auth users (no profile):`);
  for (const o of orphans) {
    console.log(`  ${o.id} | ${o.email}`);
    // Clean up their data from all tables
    const tables = [
      'user_settings', 'user_plans', 'family_invitations', 'family_members',
      'child_profiles', 'watch_requests', 'watch_history', 'watchlist',
      'liked_movies', 'reviews', 'notifications', 'activity_logs',
    ];
    for (const table of tables) {
      try {
        await supabase.from(table).delete().eq('user_id', o.id);
      } catch {}
    }
    // Now delete from auth.users
    const { error } = await supabase.auth.admin.deleteUser(o.id);
    if (error) {
      console.log(`  -> FAILED to delete: ${error.message}`);
    } else {
      console.log(`  -> Deleted successfully`);
    }
  }

  if (orphans.length === 0) {
    console.log('No orphaned users found.');
  }
}

cleanOrphans().catch(console.error);
