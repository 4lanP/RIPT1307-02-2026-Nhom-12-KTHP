const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');
const { ConflictError, NotFoundError, ValidationError } = require('../utils/errors');

const USER_COLUMNS = 'id, email, full_name, role, is_active, created_at';

function buildUpdate(table, id, data, fieldMap) {
  const entries = Object.entries(fieldMap).filter(([key]) => data[key] !== undefined);
  if (entries.length === 0) {
    throw new ValidationError('No fields to update');
  }

  const sets = entries.map(([, field], index) => {
    const spec = typeof field === 'string' ? { column: field } : field;
    const cast = spec.cast ? `::${spec.cast}` : '';
    return `${spec.column} = $${index + 1}${cast}`;
  });
  const values = entries.map(([key]) => data[key]);
  values.push(id);

  return {
    text: `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  };
}

function ensureFound(rows, message) {
  if (rows.length === 0) {
    throw new NotFoundError(message);
  }
  return rows[0];
}

async function listUsers() {
  const { rows } = await pool.query(`SELECT ${USER_COLUMNS} FROM USERS ORDER BY id`);
  return rows;
}

async function createUser(data) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  const { rows } = await pool.query(
    `INSERT INTO USERS (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4::user_role)
     RETURNING ${USER_COLUMNS}`,
    [data.email, passwordHash, data.full_name, data.role]
  );
  return rows[0];
}

async function updateUser(id, data) {
  const update = buildUpdate('USERS', id, data, {
    email: 'email',
    full_name: 'full_name',
    role: { column: 'role', cast: 'user_role' },
    is_active: 'is_active',
  });
  update.text = update.text.replace('RETURNING *', `RETURNING ${USER_COLUMNS}`);

  const { rows } = await pool.query(update.text, update.values);
  return ensureFound(rows, 'User not found');
}

async function deactivateUser(id) {
  const { rows } = await pool.query(
    `UPDATE USERS SET is_active = false WHERE id = $1 RETURNING ${USER_COLUMNS}`,
    [id]
  );
  return ensureFound(rows, 'User not found');
}

async function listTables() {
  const { rows } = await pool.query('SELECT * FROM TABLES ORDER BY zone, name');
  return rows;
}

async function createTable(data) {
  const { rows } = await pool.query(
    `INSERT INTO TABLES (name, zone, capacity, status)
     VALUES ($1, $2, $3, COALESCE($4::table_status, 'AVAILABLE'::table_status))
     RETURNING *`,
    [data.name, data.zone, data.capacity, data.status]
  );
  return rows[0];
}

async function updateTable(id, data) {
  const update = buildUpdate('TABLES', id, data, {
    name: 'name',
    zone: 'zone',
    capacity: 'capacity',
    status: { column: 'status', cast: 'table_status' },
  });

  const { rows } = await pool.query(update.text, update.values);
  return ensureFound(rows, 'Table not found');
}

async function deleteTable(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tableRes = await client.query('SELECT * FROM TABLES WHERE id = $1 FOR UPDATE', [id]);
    const table = ensureFound(tableRes.rows, 'Table not found');
    if (table.status !== 'AVAILABLE') {
      throw new ConflictError('Only AVAILABLE tables can be deleted');
    }

    const activeSessionRes = await client.query(
      "SELECT id FROM SESSIONS WHERE table_id = $1 AND status = 'ACTIVE' LIMIT 1",
      [id]
    );
    if (activeSessionRes.rows.length > 0) {
      throw new ConflictError('Table has an active session');
    }

    await client.query('DELETE FROM QR_CODES WHERE table_id = $1', [id]);
    await client.query('DELETE FROM TABLES WHERE id = $1', [id]);
    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listQrCodes(tableId) {
  const values = [];
  let where = '';
  if (tableId !== undefined) {
    values.push(tableId);
    where = 'WHERE q.table_id = $1';
  }

  const { rows } = await pool.query(
    `SELECT q.*, t.name as table_name
     FROM QR_CODES q
     JOIN TABLES t ON t.id = q.table_id
     ${where}
     ORDER BY q.id`,
    values
  );
  return rows;
}

async function createQrCode(data) {
  const code = data.code || `QR-${data.table_id}-${crypto.randomUUID()}`;
  const { rows } = await pool.query(
    `INSERT INTO QR_CODES (table_id, code, is_active)
     VALUES ($1, $2, COALESCE($3, true))
     RETURNING *`,
    [data.table_id, code, data.is_active]
  );
  return rows[0];
}

async function toggleQrCode(id) {
  const { rows } = await pool.query(
    'UPDATE QR_CODES SET is_active = NOT is_active WHERE id = $1 RETURNING *',
    [id]
  );
  return ensureFound(rows, 'QR code not found');
}

async function deleteQrCode(id) {
  const { rows } = await pool.query('UPDATE QR_CODES SET is_active = false WHERE id = $1 RETURNING *', [id]);
  ensureFound(rows, 'QR code not found');
  return { success: true };
}

async function listCategories() {
  const { rows } = await pool.query('SELECT * FROM MENU_CATEGORIES ORDER BY sort_order, id');
  return rows;
}

async function createCategory(data) {
  const { rows } = await pool.query(
    `INSERT INTO MENU_CATEGORIES (name, station, sort_order, is_active)
     VALUES ($1, $2::kds_station, COALESCE($3, 0), COALESCE($4, true))
     RETURNING *`,
    [data.name, data.station, data.sort_order, data.is_active]
  );
  return rows[0];
}

async function updateCategory(id, data) {
  const update = buildUpdate('MENU_CATEGORIES', id, data, {
    name: 'name',
    station: { column: 'station', cast: 'kds_station' },
    sort_order: 'sort_order',
    is_active: 'is_active',
  });

  const { rows } = await pool.query(update.text, update.values);
  return ensureFound(rows, 'Category not found');
}

async function deleteCategory(id) {
  const itemRes = await pool.query(
    'SELECT id FROM MENU_ITEMS WHERE category_id = $1 AND is_available = true LIMIT 1',
    [id]
  );
  if (itemRes.rows.length > 0) {
    throw new ConflictError('Category has active menu items');
  }

  const { rows } = await pool.query(
    'UPDATE MENU_CATEGORIES SET is_active = false WHERE id = $1 RETURNING *',
    [id]
  );
  return ensureFound(rows, 'Category not found');
}

async function listItems(categoryId) {
  const values = [];
  let where = '';
  if (categoryId !== undefined) {
    values.push(categoryId);
    where = 'WHERE mi.category_id = $1';
  }

  const { rows } = await pool.query(
    `SELECT mi.*, mc.name as category_name, mc.station
     FROM MENU_ITEMS mi
     JOIN MENU_CATEGORIES mc ON mc.id = mi.category_id
     ${where}
     ORDER BY mi.sort_order, mi.id`,
    values
  );
  return rows;
}

async function createItem(data) {
  const { rows } = await pool.query(
    `INSERT INTO MENU_ITEMS
       (category_id, name, price, image_url, daily_quota, daily_quota_default, sort_order, is_available)
     VALUES ($1, $2, $3, $4, COALESCE($5, 0), COALESCE($6, $5, 0), COALESCE($7, 0), COALESCE($8, true))
     RETURNING *`,
    [
      data.category_id,
      data.name,
      data.price,
      data.image_url || null,
      data.daily_quota,
      data.daily_quota_default,
      data.sort_order,
      data.is_available,
    ]
  );
  return rows[0];
}

async function updateItem(id, data) {
  const update = buildUpdate('MENU_ITEMS', id, data, {
    category_id: 'category_id',
    name: 'name',
    price: 'price',
    image_url: 'image_url',
    daily_quota: 'daily_quota',
    daily_quota_default: 'daily_quota_default',
    sort_order: 'sort_order',
    is_available: 'is_available',
  });

  const { rows } = await pool.query(update.text, update.values);
  return ensureFound(rows, 'Menu item not found');
}

async function deleteItem(id) {
  const { rows } = await pool.query(
    'UPDATE MENU_ITEMS SET is_available = false WHERE id = $1 RETURNING *',
    [id]
  );
  return ensureFound(rows, 'Menu item not found');
}

async function listOptions(menuItemId) {
  const { rows } = await pool.query(
    'SELECT * FROM MENU_ITEM_OPTIONS WHERE menu_item_id = $1 ORDER BY id',
    [menuItemId]
  );
  return rows;
}

async function createOption(menuItemId, data) {
  const { rows } = await pool.query(
    `INSERT INTO MENU_ITEM_OPTIONS (menu_item_id, option_group, option_name, extra_price, is_available)
     VALUES ($1, $2, $3, COALESCE($4, 0), COALESCE($5, true))
     RETURNING *`,
    [menuItemId, data.option_group, data.option_name, data.extra_price, data.is_available]
  );
  return rows[0];
}

async function updateOption(id, data) {
  const update = buildUpdate('MENU_ITEM_OPTIONS', id, data, {
    option_group: 'option_group',
    option_name: 'option_name',
    extra_price: 'extra_price',
    is_available: 'is_available',
  });

  const { rows } = await pool.query(update.text, update.values);
  return ensureFound(rows, 'Menu option not found');
}

async function deleteOption(id) {
  const { rows } = await pool.query(
    'UPDATE MENU_ITEM_OPTIONS SET is_available = false WHERE id = $1 RETURNING *',
    [id]
  );
  return ensureFound(rows, 'Menu option not found');
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  listTables,
  createTable,
  updateTable,
  deleteTable,
  listQrCodes,
  createQrCode,
  toggleQrCode,
  deleteQrCode,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listItems,
  createItem,
  updateItem,
  deleteItem,
  listOptions,
  createOption,
  updateOption,
  deleteOption,
};
