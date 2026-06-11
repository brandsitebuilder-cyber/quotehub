const fs = require('fs');

const env = {};
fs.readFileSync('/home/marcus/projects/quotehub/.env.local', 'utf8')
  .split('\n')
  .forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) env[k.trim()] = rest.join('=').trim();
  });

const { createClient } = require('./node_modules/@supabase/supabase-js');
const supabase = createClient(
  'https://lxteyhbdkzfldfnnzsyz.supabase.co',
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Try inserting with the new column
  const { data, error } = await supabase
    .from('quote_requests')
    .insert({
      client_id: '2df1f485-2d26-4f04-b6e0-df40b5d5cd85',
      customer_name: 'Timeline Test',
      timeline: 'ASAP'
    })
    .select();
  
  if (error) {
    console.log('Column missing:', error.message);
  } else {
    console.log('Column exists! Insert id:', data[0].id);
    await supabase.from('quote_requests').delete().eq('id', data[0].id);
    console.log('Test cleaned up.');
  }
}

main();
