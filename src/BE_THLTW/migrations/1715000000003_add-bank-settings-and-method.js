/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql("ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'BANK_TRANSFER'");

  pgm.createTable('RESTAURANT_SETTINGS', {
    key: { type: 'varchar(100)', primaryKey: true },
    value: { type: 'jsonb', notNull: true },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.sql(`
    INSERT INTO RESTAURANT_SETTINGS (key, value)
    VALUES ('bank_config', '{"bank_id":"","account_number":"","account_owner":""}'::jsonb)
    ON CONFLICT (key) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('RESTAURANT_SETTINGS');
};
