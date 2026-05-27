const { Pool } = require('pg');
require('dotenv').config();

async function migrateInvoices() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
          CREATE TYPE invoice_status AS ENUM ('ISSUED', 'SUPERSEDED', 'CANCELLED');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_payment_status') THEN
          CREATE TYPE invoice_payment_status AS ENUM ('UNPAID', 'PENDING', 'PAID');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_print_type') THEN
          CREATE TYPE invoice_print_type AS ENUM ('PRINT', 'REPRINT');
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS INVOICES (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(40) UNIQUE NOT NULL,
        session_id INT NOT NULL REFERENCES SESSIONS(id),
        table_id INT NOT NULL REFERENCES TABLES(id),
        table_name VARCHAR(100) NOT NULL,
        created_by INT NOT NULL REFERENCES USERS(id),
        created_by_name VARCHAR(255),
        status invoice_status DEFAULT 'ISSUED' NOT NULL,
        payment_status invoice_payment_status DEFAULT 'UNPAID' NOT NULL,
        payment_method payment_method,
        bill_fingerprint VARCHAR(64) NOT NULL,
        subtotal DECIMAL(10,2) DEFAULT 0 NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
        rounding_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
        final_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        superseded_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS INVOICE_LINE_ITEMS (
        id SERIAL PRIMARY KEY,
        invoice_id INT NOT NULL REFERENCES INVOICES(id) ON DELETE CASCADE,
        order_item_id INT REFERENCES ORDER_ITEMS(id),
        item_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) DEFAULT 0 NOT NULL,
        options_total DECIMAL(10,2) DEFAULT 0 NOT NULL,
        line_total DECIMAL(10,2) DEFAULT 0 NOT NULL,
        note TEXT,
        sort_order INT DEFAULT 0 NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS INVOICE_PRINT_EVENTS (
        id SERIAL PRIMARY KEY,
        invoice_id INT NOT NULL REFERENCES INVOICES(id) ON DELETE CASCADE,
        printed_by INT NOT NULL REFERENCES USERS(id),
        printed_by_name VARCHAR(255),
        print_type invoice_print_type NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_session_id ON INVOICES(session_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_session_fingerprint ON INVOICES(session_id, bill_fingerprint)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON INVOICES(created_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON INVOICE_LINE_ITEMS(invoice_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_invoice_print_events_invoice_id ON INVOICE_PRINT_EVENTS(invoice_id)');

    console.log('Invoice migration completed.');
  } finally {
    await pool.end();
  }
}

migrateInvoices().catch((error) => {
  console.error('Invoice migration failed:', error.message);
  process.exit(1);
});
