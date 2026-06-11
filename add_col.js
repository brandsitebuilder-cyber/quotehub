const fs = require('fs');

// Read env
const env = {};
fs.readFileSync('/home/marcus/projects/quotehub/.env.local', 'utf8')
  .split('\n')
  .forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) env[k.trim()] = rest.join('=').trim();
  });

// Connect via Supabase connection pooler
const { Pool } = require('pg');
const pool = new Pool({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.lxteyhbdkzfldfnnzsyz',
  password: env.SUPABASE_SERVICE_ROLE_KEY,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    await pool.query('ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS timeline TEXT;');
    console.log('timeline column added!');
  } catch (e) {
    console.log('Error:', e.message);
  }
  await pool.end();
}

main();
