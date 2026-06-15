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

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node scripts/delete-user.js <user_id>');
  console.error('Get the user_id from the admin dashboard or Supabase Auth > Users');
  process.exit(1);
}

async function deleteUser() {
  console.log(`Deleting user ${userId} from auth.users and all related data...`);
  const { data, error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  console.log('User completely deleted from auth.users + all tables (CASCADE).');
}

deleteUser().catch(console.error);
