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

async function fix() {
  const newEmail = 'Mhmd@gmail.com';
  const password = 'MHMD@123';

  // Create the new admin user (will fail if exists, that's ok)
  const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
    email: newEmail,
    password,
    email_confirm: true,
    user_metadata: { username: 'admin', full_name: 'Administrator', role: 'admin' },
  });

  if (createErr && createErr.message.includes('already been registered')) {
    console.log('Mhmd@gmail.com already exists, looking it up...');
    const { data: users } = await supabase.auth.admin.listUsers();
    const existing = users?.users?.find(u => u.email?.toLowerCase() === newEmail.toLowerCase());
    if (existing) {
      console.log('Updating existing user to admin:', existing.id);
      await supabase.auth.admin.updateUserById(existing.id, { password });
      await supabase.from('profiles').update({ role: 'admin' }).eq('id', existing.id);
      console.log('Password updated & role set to admin.');
    }
  } else if (createErr) {
    throw createErr;
  } else {
    console.log('Created admin user:', newUser.user.id);
    await supabase.from('profiles').upsert({
      id: newUser.user.id,
      username: 'admin',
      full_name: 'Administrator',
      email: newEmail,
      role: 'admin',
    });
  }

  // Delete the old admin@gmail.com if it still exists
  const { data: users } = await supabase.auth.admin.listUsers();
  const oldAdmin = users?.users?.find(u => u.email?.toLowerCase() === 'admin@gmail.com');
  if (oldAdmin) {
    console.log('Deleting old admin@gmail.com:', oldAdmin.id);
    await supabase.auth.admin.deleteUser(oldAdmin.id);
  }

  console.log('\nDone! Sign in with: Mhmd@gmail.com / MHMD@123');
}

fix().catch(console.error);
