const { Pool } = require('pg');
require('dotenv').config();

async function ensureMenuImageColumnSupportsBase64(existingPool) {
  const pool = existingPool || new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const { rows } = await pool.query(`
      SELECT data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'menu_items'
        AND column_name = 'image_url'
    `);

    if (rows.length === 0) {
      console.warn('Menu image column migration skipped: MENU_ITEMS.image_url was not found.');
      return { changed: false, reason: 'missing-column' };
    }

    const column = rows[0];
    if (column.data_type === 'text') {
      return { changed: false, reason: 'already-text' };
    }

    await pool.query('ALTER TABLE MENU_ITEMS ALTER COLUMN image_url TYPE TEXT');
    console.log('Menu image column migration completed: MENU_ITEMS.image_url is TEXT.');
    return { changed: true };
  } finally {
    if (!existingPool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  ensureMenuImageColumnSupportsBase64().catch((error) => {
    console.error('Menu image column migration failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  ensureMenuImageColumnSupportsBase64,
};
