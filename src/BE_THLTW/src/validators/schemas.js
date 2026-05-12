const { z } = require('zod');

// Common validation schemas
const commonSchemas = {
  id: z.number().int().positive(),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase, one lowercase, and one number'
  ),
  phoneNumber: z.string().regex(/^(\+84|0)[0-9]{9,10}$/, 'Invalid Vietnamese phone number'),
  url: z.string().url().max(500),
  positiveDecimal: z.number().positive().multipleOf(0.01),
  nonNegativeInt: z.number().int().nonnegative(),
  text: z.string().max(1000).trim(),
  longText: z.string().max(5000).trim(),
};

// XSS prevention - sanitize HTML
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// SQL injection prevention check (paranoid mode)
const hasSQLInjectionPattern = (str) => {
  if (typeof str !== 'string') return false;
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|;|\/\*|\*\/|xp_|sp_)/i,
    /(\bOR\b.*=.*|1=1|'=')/i,
  ];
  return sqlPatterns.some(pattern => pattern.test(str));
};

// Custom Zod refinements
const safeString = z.string().refine(
  (val) => !hasSQLInjectionPattern(val),
  { message: 'Invalid characters detected' }
);

const safeText = z.string().max(1000).trim().refine(
  (val) => !hasSQLInjectionPattern(val),
  { message: 'Invalid characters detected' }
);

// Auth schemas
const authSchemas = {
  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1).max(100),
  }),

  register: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    full_name: safeString.min(2).max(255),
    role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER']),
  }),

  refreshToken: z.object({
    refresh_token: z.string().min(1),
  }),
};

// Session schemas
const sessionSchemas = {
  scanQR: z.object({
    qr_code: z.string().uuid('Invalid QR code format'),
  }),

  getSession: z.object({
    session_id: commonSchemas.id,
  }),
};

// Order schemas
const orderSchemas = {
  createOrder: z.object({
    session_id: commonSchemas.id,
    items: z.array(z.object({
      menu_item_id: commonSchemas.id,
      quantity: z.number().int().min(1).max(99),
      note: safeText.optional(),
      options: z.array(z.object({
        menu_item_option_id: commonSchemas.id,
        quantity: z.number().int().min(1).max(10),
      })).optional(),
    })).min(1).max(50),
  }),

  updateOrderStatus: z.object({
    order_id: commonSchemas.id,
    status: z.enum(['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']),
  }),

  cancelOrderItem: z.object({
    order_item_id: commonSchemas.id,
    cancel_reason: safeText.min(5).max(500),
  }),
};

// Menu schemas
const menuSchemas = {
  createMenuItem: z.object({
    category_id: commonSchemas.id,
    name: safeString.min(2).max(255),
    price: commonSchemas.positiveDecimal,
    image_url: commonSchemas.url.optional(),
    daily_quota: commonSchemas.nonNegativeInt.optional(),
    daily_quota_default: commonSchemas.nonNegativeInt.optional(),
    sort_order: commonSchemas.nonNegativeInt.optional(),
  }),

  updateMenuItem: z.object({
    id: commonSchemas.id,
    name: safeString.min(2).max(255).optional(),
    price: commonSchemas.positiveDecimal.optional(),
    image_url: commonSchemas.url.optional().nullable(),
    daily_quota: commonSchemas.nonNegativeInt.optional(),
    is_available: z.boolean().optional(),
  }),
};

// Payment schemas
const paymentSchemas = {
  createPayment: z.object({
    session_id: commonSchemas.id,
    method: z.enum(['CASH', 'VNPAY']),
    amount: commonSchemas.positiveDecimal,
  }),

  vnpayCallback: z.object({
    vnp_TxnRef: z.string(),
    vnp_Amount: z.string().regex(/^\d+$/),
    vnp_ResponseCode: z.string().length(2),
    vnp_TransactionNo: z.string(),
    vnp_SecureHash: z.string(),
  }),
};

// Request schemas
const requestSchemas = {
  createRequest: z.object({
    session_id: commonSchemas.id,
    request_type: z.enum(['CALL_STAFF', 'REQUEST_BILL', 'OTHER']),
  }),

  resolveRequest: z.object({
    request_id: commonSchemas.id,
  }),
};

// Table schemas
const tableSchemas = {
  createTable: z.object({
    name: safeString.min(1).max(50),
    zone: safeString.min(1).max(50),
    capacity: z.number().int().min(1).max(20),
  }),

  updateTable: z.object({
    id: commonSchemas.id,
    name: safeString.min(1).max(50).optional(),
    zone: safeString.min(1).max(50).optional(),
    capacity: z.number().int().min(1).max(20).optional(),
    status: z.enum(['AVAILABLE', 'OCCUPIED']).optional(),
  }),
};

// User schemas
const userSchemas = {
  createUser: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    full_name: safeString.min(2).max(255),
    role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER']),
  }),

  updateUser: z.object({
    id: commonSchemas.id,
    email: commonSchemas.email.optional(),
    full_name: safeString.min(2).max(255).optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER']).optional(),
    is_active: z.boolean().optional(),
  }),

  changePassword: z.object({
    user_id: commonSchemas.id,
    old_password: z.string().min(1),
    new_password: commonSchemas.password,
  }),
};

// Report schemas
const reportSchemas = {
  getRevenue: z.object({
    start_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    end_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    group_by: z.enum(['day', 'month', 'year']).optional(),
  }),

  getTopItems: z.object({
    start_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    end_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
};

module.exports = {
  commonSchemas,
  sanitizeString,
  hasSQLInjectionPattern,
  safeString,
  safeText,
  authSchemas,
  sessionSchemas,
  orderSchemas,
  menuSchemas,
  paymentSchemas,
  requestSchemas,
  tableSchemas,
  userSchemas,
  reportSchemas,
};
