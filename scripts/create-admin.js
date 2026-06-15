import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const envFile = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
  const env = {};
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(`
  Missing environment variables.

  Make sure your .env file has:
    SUPABASE_SERVICE_KEY=your_service_role_key
  `);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createAdmin() {
  const email = 'Mhmd@gmail.com';
  const password = 'MHMD@123';
  const username = 'admin';
  const fullName = 'Administrator';

  console.log(`Creating admin account: ${email}`);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, full_name: fullName, role: 'admin' },
  });

  if (authError) {
    if (authError.message?.includes('already exists')) {
      console.log('Admin user already exists. Updating role...');
      const { data: userData } = await supabase.auth.admin.getUserByEmail(email);
      if (userData?.user) {
        await supabase.from('profiles').update({ role: 'admin' }).eq('id', userData.user.id);
        console.log('Role updated to admin.');
      }
    } else {
      console.error('Error creating admin user:', authError.message);
      process.exit(1);
    }
  } else {
    console.log(`Admin user created: ${authData.user?.id}`);

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      username,
      full_name: fullName,
      email,
      role: 'admin',
    });

    if (profileError) {
      console.error('Error setting admin profile:', profileError.message);
    } else {
      console.log('Admin profile created successfully.');
    }
  }

  console.log('\nDone! You can now sign in with:');
  console.log('  Email:    admin@gmail.com');
  console.log('  Password: MHMD@123');
}

createAdmin().catch(console.error);
