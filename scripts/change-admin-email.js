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

async function changeEmail() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const admin = users?.users?.find(u => u.email?.toLowerCase() === 'mhmd@gmail.com');
  if (!admin) {
    console.log('Admin user mhmd@gmail.com not found');
    return;
  }

  console.log('Found admin:', admin.id, admin.email);

  // Update auth email
  const { error } = await supabase.auth.admin.updateUserById(admin.id, {
    email: 'Mhmdadmin@gmail.com',
  });
  if (error) {
    console.error('Error updating auth email:', error.message);
    // If already exists, we'll still try to update profile
  } else {
    console.log('Auth email updated to Mhmdadmin@gmail.com');
  }

  // Update profile email
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ email: 'Mhmdadmin@gmail.com' })
    .eq('id', admin.id);
  if (profileError) {
    console.error('Error updating profile email:', profileError.message);
  } else {
    console.log('Profile email updated');
  }

  console.log('\nDone! Sign in with: Mhmdadmin@gmail.com / MHMD@123');
}

changeEmail().catch(console.error);
