import nodemailer from 'nodemailer';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@oceanofmovies.com';
const FROM_NAME = process.env.FROM_NAME || 'Oceanic Admin';
const USER_EVENT_KEY = process.env.USER_EVENT_KEY;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const apiKey = req.headers['x-api-key'];

    // User events (welcome, login) — authenticated via shared key
    if (apiKey && apiKey === USER_EVENT_KEY) {
      const { eventType, email, name } = req.body || {};
      if (!eventType || !email) {
        return res.status(400).json({ error: 'eventType and email required' });
      }

      const displayName = name || email.split('@')[0];
      let subject, text, html;

      if (eventType === 'welcome') {
        subject = `Welcome to Oceanic, ${displayName}!`;
        text = `Hey ${displayName},\n\nWelcome to Oceanic! Your account is ready and you can now explore thousands of movies, series, and books.\n\nHere's what you can do:\n- Browse trending movies and series\n- Build your personal watchlist\n- Track what you've watched and read\n- Get personalized recommendations\n\nStart your journey now:\n${process.env.VITE_APP_URL || 'https://ocean-of-movies-pi.vercel.app'}/browse\n\nSee you there,\nThe Oceanic Team`;
        html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
            <h1 style="color:#fff;font-size:24px;margin:0;">Welcome to Oceanic!</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Your personal entertainment hub</p>
          </div>
          <div style="padding:32px 24px;">
            <p style="color:#374151;font-size:15px;line-height:1.6;">Hey ${displayName},</p>
            <p style="color:#374151;font-size:15px;line-height:1.6;">Your account is ready! Dive into a world of movies, series, and books curated just for you.</p>
            <div style="margin:24px 0;">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <div style="width:32px;height:32px;background:#eef2ff;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6366f1;font-size:16px;">&#9733;</div>
                <span style="color:#374151;font-size:14px;">Browse trending movies and series</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                <div style="width:32px;height:32px;background:#eef2ff;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6366f1;font-size:16px;">&#9825;</div>
                <span style="color:#374151;font-size:14px;">Build your personal watchlist</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:32px;height:32px;background:#eef2ff;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#6366f1;font-size:16px;">&#9733;</div>
                <span style="color:#374151;font-size:14px;">Get personalized recommendations</span>
              </div>
            </div>
            <a href="${process.env.VITE_APP_URL || 'https://ocean-of-movies-pi.vercel.app'}/browse" style="display:block;text-align:center;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600;">Start Exploring</a>
          </div>
          <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">The Oceanic Team &bull; Ocean of Movies</p>
          </div>
        </div>`;
      } else if (eventType === 'login') {
        const time = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
        subject = `New sign-in to your Oceanic account`;
        text = `Hi ${displayName},\n\nThere was a new sign-in to your Oceanic account at ${time} UTC.\n\nIf this was you, you can ignore this email. If not, please change your password immediately.\n\nThe Oceanic Team`;
        html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#6366f1;">New Sign-In</h2>
          <p>Hi ${displayName},</p>
          <p>There was a new sign-in to your Oceanic account at <strong>${time} UTC</strong>.</p>
          <p style="color:#666;font-size:13px;">If this was you, no action needed. If not, secure your account right away.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
          <p style="color:#666;font-size:13px;">The Oceanic Team</p>
        </div>`;
      } else {
        return res.status(400).json({ error: `Unknown eventType: ${eventType}` });
      }

      await transporter.sendMail({ from: `"${FROM_NAME}" <${FROM_EMAIL}>`, to: email, subject, text, html });
      return res.status(200).json({ success: true });
    }

    // Admin email sending — authenticated via JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization' });
    }
    const token = authHeader.split(' ')[1];
    const admin = await verifyAdmin(token);
    if (!admin) return res.status(403).json({ error: 'Unauthorized — admin only' });

    const { userId, subject, message, userEmail } = req.body || {};
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required' });

    let recipientEmail = userEmail;
    if (userId && !recipientEmail) {
      const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=email&id=eq.${userId}`, {
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
      });
      const profiles = await profileRes.json();
      recipientEmail = profiles?.[0]?.email;
    }

    if (!recipientEmail) return res.status(404).json({ error: 'User email not found' });

    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: recipientEmail,
      subject,
      text: message,
      html: message.replace(/\n/g, '<br/>'),
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send email' });
  }
}
