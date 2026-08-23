const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.fgkuhrayiwoyxprokmye:Kehsva%403020@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' // 6543 is for pooler, 5432 is direct
});

async function run() {
  try {
    await client.connect();
    console.log("Connected!");
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("Tables:", res.rows.map(r => r.table_name).join(', '));
    
    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='submissions'");
    console.log("Submission Columns:", cols.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}
run();
