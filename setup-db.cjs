const https = require('https');

const SUPABASE_URL = 'https://jqsoyffbqwiyggsvlfzk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxc295ZmZicXdpeWdnc3ZsZnprIiwicm9sZSI6InJvb3QiLCJpYXQiOjE3NzU1NjEzMzQsImV4cCI6MjA5MTEzNzMzNH0.LbTiz5z7i4tVd0OJTSpyhkEjd4LMJXavsxbyDULFxnU';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function setup() {
  console.log('Setting up tables via Supabase REST API...\n');

  // Create watchlist table
  console.log('Creating watchlist table...');
  const watchlistRes = await request('POST', '/rest/v1/', {
    query: `
      CREATE TABLE IF NOT EXISTS watchlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        movie_id TEXT NOT NULL,
        movie_type TEXT DEFAULT 'movie',
        title TEXT NOT NULL,
        poster_url TEXT,
        year TEXT,
        added_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, movie_id, movie_type)
      )
    `
  });
  console.log('Watchlist:', watchlistRes);

  // Create liked_movies table
  console.log('\nCreating liked_movies table...');
  const likedRes = await request('POST', '/rest/v1/', {
    query: `
      CREATE TABLE IF NOT EXISTS liked_movies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        movie_id TEXT NOT NULL,
        movie_type TEXT DEFAULT 'movie',
        title TEXT NOT NULL,
        poster_url TEXT,
        year TEXT,
        liked_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, movie_id, movie_type)
      )
    `
  });
  console.log('Liked movies:', likedRes);

  console.log('\nNote: REST API cannot run raw SQL. Please create tables manually in Supabase SQL Editor.');
}

setup().catch(console.error);
