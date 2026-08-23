const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.fgkuhrayiwoyxprokmye:Kehsva%403020@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

async function check() {
  await client.connect();
  
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log("Tables:", tables.rows.map(r => r.table_name).join(', '));
  
  const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'submissions'");
  console.log("Submissions columns:", cols.rows.map(r => r.column_name).join(', '));
  
  await client.end();
}

check().catch(console.error);
