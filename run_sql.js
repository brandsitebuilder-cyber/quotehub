const fs = require('fs');

const env = {};
fs.readFileSync('/home/marcus/projects/quotehub/.env.local', 'utf8')
  .split('\n')
  .forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) env[k.trim()] = rest.join('=').trim();
  });

// Use Supabase Management API to run SQL
const https = require('https');

const data = JSON.stringify({
  query: 'ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS timeline TEXT;'
});

const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: '/v1/projects/lxteyhbdkzfldfnnzsyz/database/query',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ***{env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body.substring(0, 500));
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
