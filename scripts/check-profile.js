import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env'), 'utf-8').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

// Use anon key (like the app does)
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function check() {
  // First sign in as admin
  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'Mhmdadmin@gmail.com',
    password: 'MHMD@123',
  });

  if (signInError) {
    console.error('Sign in error:', signInError.message);
    return;
  }

  console.log('Signed in as:', signIn.user?.email, signIn.user?.id);

  // Now fetch profile (like the app does)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', signIn.user.id)
    .single();

  if (profileError) {
    console.error('Profile fetch error:', profileError.message);
  } else {
    console.log('Profile:', JSON.stringify(profile, null, 2));
    console.log('isAdmin?', profile?.role === 'admin');
  }

  await supabase.auth.signOut();
}

check().catch(console.error);
