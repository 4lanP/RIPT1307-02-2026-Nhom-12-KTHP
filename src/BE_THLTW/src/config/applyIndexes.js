const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function applyIndexes() {
  const client = await pool.connect();
  try {
    console.log('📊 Applying database indexes...');

    const indexesSQL = fs.readFileSync(
      path.join(__dirname, 'indexes.sql'),
      'utf-8'
    );

    await client.query(indexesSQL);

    console.log('✅ Database indexes applied successfully!');
  } catch (error) {
    console.error('❌ Error applying indexes:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyIndexes();
