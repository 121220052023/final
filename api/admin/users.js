const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function verifyAdmin(token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=role&id=eq.${user.id}`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  const profiles = await profileRes.json();
  return profiles?.[0]?.role === 'admin' ? user : null;
}

async function createUser(email, password, role, full_name) {
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name } }),
  });
  const createdUser = await createRes.json();
  if (!createRes.ok) throw new Error(createdUser.msg || createdUser.error || 'Failed to create user');
  if (!createdUser?.id) throw new Error('No user ID returned');

  let baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 20);
  if (!/^[a-z]/.test(baseUsername)) baseUsername = 'u' + baseUsername;
  let username = baseUsername;
  for (let i = 0; i < 10; i++) {
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id&username=eq.${encodeURIComponent(username)}`,
      { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const existing = await checkRes.json();
    if (!existing || existing.length === 0) break;
    username = baseUsername + (i + 1);
  }

  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ id: createdUser.id, email, full_name, role, username }),
  });
  if (!profileRes.ok) {
    const profileErr = await profileRes.text();
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${createdUser.id}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
    });
    throw new Error(profileErr || 'Failed to create profile');
  }
  return createdUser;
}

async function deleteUser(userId) {
  const errors = [];
  const settingsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_settings?user_id=eq.${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  if (!settingsRes.ok && settingsRes.status !== 404) errors.push(`user_settings: ${await settingsRes.text()}`);

  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  if (!profileRes.ok) errors.push(`profiles: ${await profileRes.text()}`);

  const authRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  if (!authRes.ok && authRes.status !== 404) errors.push(`auth: ${await authRes.text()}`);

  if (errors.length > 0) throw new Error(errors.join('; '));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization' });
    }
    const token = authHeader.split(' ')[1];
    const admin = await verifyAdmin(token);
    if (!admin) return res.status(403).json({ error: 'Unauthorized — admin only' });

    if (req.method === 'POST') {
      const { email, password, role, full_name } = req.body || {};
      if (!email || !password || !role || !full_name) {
        return res.status(400).json({ error: 'email, password, role, and full_name required' });
      }
      const user = await createUser(email, password, role, full_name);
      return res.status(200).json({ success: true, user });
    }

    if (req.method === 'DELETE') {
      const { user_id } = req.body || {};
      if (!user_id) return res.status(400).json({ error: 'user_id required' });
      await deleteUser(user_id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: err.message || 'Operation failed' });
  }
}
