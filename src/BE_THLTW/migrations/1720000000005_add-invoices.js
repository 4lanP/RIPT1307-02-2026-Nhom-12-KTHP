/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE invoice_status AS ENUM ('ISSUED', 'SUPERSEDED', 'CANCELLED');
    CREATE TYPE invoice_payment_status AS ENUM ('UNPAID', 'PENDING', 'PAID');
    CREATE TYPE invoice_print_type AS ENUM ('PRINT', 'REPRINT');
  `);

  pgm.createTable('INVOICES', {
    id: 'id',
    invoice_number: { type: 'varchar(40)', notNull: true, unique: true },
    session_id: { type: 'integer', notNull: true, references: 'SESSIONS(id)' },
    table_id: { type: 'integer', notNull: true, references: 'TABLES(id)' },
    table_name: { type: 'varchar(100)', notNull: true },
    created_by: { type: 'integer', notNull: true, references: 'USERS(id)' },
    created_by_name: { type: 'varchar(255)' },
    status: { type: 'invoice_status', notNull: true, default: 'ISSUED' },
    payment_status: { type: 'invoice_payment_status', notNull: true, default: 'UNPAID' },
    payment_method: { type: 'payment_method' },
    bill_fingerprint: { type: 'varchar(64)', notNull: true },
    subtotal: { type: 'decimal(10,2)', notNull: true, default: 0 },
    discount_amount: { type: 'decimal(10,2)', notNull: true, default: 0 },
    tax_amount: { type: 'decimal(10,2)', notNull: true, default: 0 },
    rounding_amount: { type: 'decimal(10,2)', notNull: true, default: 0 },
    final_amount: { type: 'decimal(10,2)', notNull: true, default: 0 },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    superseded_at: { type: 'timestamp' },
  });

  pgm.createTable('INVOICE_LINE_ITEMS', {
    id: 'id',
    invoice_id: { type: 'integer', notNull: true, references: 'INVOICES(id)', onDelete: 'CASCADE' },
    order_item_id: { type: 'integer', references: 'ORDER_ITEMS(id)' },
    item_name: { type: 'varchar(255)', notNull: true },
    quantity: { type: 'integer', notNull: true },
    unit_price: { type: 'decimal(10,2)', notNull: true, default: 0 },
    options_total: { type: 'decimal(10,2)', notNull: true, default: 0 },
    line_total: { type: 'decimal(10,2)', notNull: true, default: 0 },
    note: { type: 'text' },
    sort_order: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.createTable('INVOICE_PRINT_EVENTS', {
    id: 'id',
    invoice_id: { type: 'integer', notNull: true, references: 'INVOICES(id)', onDelete: 'CASCADE' },
    printed_by: { type: 'integer', notNull: true, references: 'USERS(id)' },
    printed_by_name: { type: 'varchar(255)' },
    print_type: { type: 'invoice_print_type', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createIndex('INVOICES', 'session_id');
  pgm.createIndex('INVOICES', ['session_id', 'bill_fingerprint']);
  pgm.createIndex('INVOICES', 'created_at');
  pgm.createIndex('INVOICE_LINE_ITEMS', 'invoice_id');
  pgm.createIndex('INVOICE_PRINT_EVENTS', 'invoice_id');
};

exports.down = (pgm) => {
  pgm.dropTable('INVOICE_PRINT_EVENTS');
  pgm.dropTable('INVOICE_LINE_ITEMS');
  pgm.dropTable('INVOICES');
  pgm.sql(`
    DROP TYPE invoice_print_type;
    DROP TYPE invoice_payment_status;
    DROP TYPE invoice_status;
  `);
};
