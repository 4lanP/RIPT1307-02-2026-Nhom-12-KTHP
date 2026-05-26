/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Add BANK_TRANSFER to payment_method enum
  pgm.addTypeValue('payment_method', 'BANK_TRANSFER');

  // 2. Create RESTAURANT_SETTINGS table
  pgm.createTable('RESTAURANT_SETTINGS', {
    key: { type: 'varchar(100)', primaryKey: true },
    value: { type: 'jsonb', notNull: true },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // 3. Seed initial bank config
  pgm.sql(`
    INSERT INTO RESTAURANT_SETTINGS (key, value)
    VALUES ('bank_config', '{"bank_id": "", "account_number": "", "account_owner": ""}'::jsonb)
    ON CONFLICT (key) DO NOTHING
  `);
};

exports.down = (pgm) => {
  // Drop table
  pgm.dropTable('RESTAURANT_SETTINGS');

  // Note: PostgreSQL does not support easy removal of enum values in migrations,
  // so we leave payment_method enum as is.
};
