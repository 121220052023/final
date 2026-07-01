require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const password = 'xX,PL37Qfb$GRX$';

const client = new Client({
  host: 'jqsoyffbqwiyggsvlfzk.supabase.co',
  port: 5432,
  user: 'postgres',
  password: password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    console.log('Connected!');
    const sql = fs.readFileSync(path.join(__dirname, 'create_movies_series_content_requests.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration ran successfully!');
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('timeout')) {
      console.log('\nTIP: Go to Supabase Dashboard → Project Settings → Database → enable "Allow IPv4" or check connection pooler settings');
    }
    await client.end().catch(() => {});
  }
}
run();
