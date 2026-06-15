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

async function backfill() {
  const { data: users } = await supabase.auth.admin.listUsers();
  let count = 0;

  for (const u of users?.users || []) {
    const { error } = await supabase
      .from('profiles')
      .update({ email: u.email })
      .eq('id', u.id);
    if (error) {
      console.error(`Failed for ${u.id} (${u.email}):`, error.message);
    } else {
      count++;
    }
  }

  console.log(`Backfilled ${count} profiles with emails.`);
}

backfill().catch(console.error);
