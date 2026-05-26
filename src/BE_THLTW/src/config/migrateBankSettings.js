const { Pool } = require('pg');
require('dotenv').config();

async function migrateBankSettings() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query("ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'BANK_TRANSFER'");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS RESTAURANT_SETTINGS (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    await pool.query(`
      INSERT INTO RESTAURANT_SETTINGS (key, value)
      VALUES ('bank_config', '{"bank_id":"","account_number":"","account_owner":""}'::jsonb)
      ON CONFLICT (key) DO NOTHING
    `);

    console.log('Bank settings migration completed.');
  } finally {
    await pool.end();
  }
}

migrateBankSettings().catch((error) => {
  console.error('Bank settings migration failed:', error.message);
  process.exit(1);
});
