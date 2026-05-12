/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // MENU_ITEM_OPTIONS table
  pgm.createTable('MENU_ITEM_OPTIONS', {
    id: 'id',
    menu_item_id: { type: 'integer', references: 'MENU_ITEMS(id)' },
    option_group: { type: 'varchar(100)', notNull: true },
    option_name: { type: 'varchar(100)', notNull: true },
    extra_price: { type: 'decimal(10,2)', default: 0 },
    is_available: { type: 'boolean', default: true }
  });

  // ORDERS table
  pgm.createTable('ORDERS', {
    id: 'id',
    session_id: { type: 'integer', references: 'SESSIONS(id)' },
    table_id: { type: 'integer', references: 'TABLES(id)' },
    status: { type: 'order_status', default: 'PENDING' },
    version: { type: 'integer', default: 1 },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    deleted_at: { type: 'timestamp' }
  });

  // ORDER_ITEMS table
  pgm.createTable('ORDER_ITEMS', {
    id: 'id',
    order_id: { type: 'integer', references: 'ORDERS(id)' },
    menu_item_id: { type: 'integer', references: 'MENU_ITEMS(id)' },
    quantity: { type: 'integer', notNull: true },
    unit_price: { type: 'decimal(10,2)', notNull: true },
    note: { type: 'text' },
    status: { type: 'order_item_status', default: 'PENDING' },
    cancel_reason: { type: 'text' },
    version: { type: 'integer', default: 1 }
  });

  // ORDER_ITEM_OPTIONS table
  pgm.createTable('ORDER_ITEM_OPTIONS', {
    id: 'id',
    order_item_id: { type: 'integer', references: 'ORDER_ITEMS(id)' },
    menu_item_option_id: { type: 'integer', references: 'MENU_ITEM_OPTIONS(id)' },
    quantity: { type: 'integer', default: 1 },
    extra_price: { type: 'decimal(10,2)', default: 0 }
  });

  // PAYMENTS table
  pgm.createTable('PAYMENTS', {
    id: 'id',
    session_id: { type: 'integer', references: 'SESSIONS(id)' },
    method: { type: 'payment_method', notNull: true },
    amount: { type: 'decimal(10,2)', notNull: true },
    status: { type: 'payment_status', default: 'PENDING' },
    transaction_id: { type: 'varchar(100)' },
    webhook_data: { type: 'jsonb' },
    paid_at: { type: 'timestamp' }
  });

  // ORDER_STATUS_LOGS table
  pgm.createTable('ORDER_STATUS_LOGS', {
    id: 'id',
    order_id: { type: 'integer', references: 'ORDERS(id)' },
    changed_by: { type: 'integer', references: 'USERS(id)' },
    old_status: { type: 'order_status' },
    new_status: { type: 'order_status', notNull: true },
    changed_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // CUSTOMER_REQUESTS table
  pgm.createTable('CUSTOMER_REQUESTS', {
    id: 'id',
    session_id: { type: 'integer', references: 'SESSIONS(id)' },
    request_type: { type: 'request_type', notNull: true },
    status: { type: 'request_status', default: 'OPEN' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    resolved_at: { type: 'timestamp' }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('CUSTOMER_REQUESTS');
  pgm.dropTable('ORDER_STATUS_LOGS');
  pgm.dropTable('PAYMENTS');
  pgm.dropTable('ORDER_ITEM_OPTIONS');
  pgm.dropTable('ORDER_ITEMS');
  pgm.dropTable('ORDERS');
  pgm.dropTable('MENU_ITEM_OPTIONS');
};
