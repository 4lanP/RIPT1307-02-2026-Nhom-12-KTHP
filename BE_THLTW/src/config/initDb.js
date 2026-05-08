const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Khởi tạo schema...');
    
    // Drop existing types and tables to ensure clean slate (Optional)
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);

    await client.query(schemaSql);
    console.log('✅ Schema đã được khởi tạo thành công!');
  } catch (err) {
    console.error('❌ Khởi tạo schema thất bại:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

initDb();
