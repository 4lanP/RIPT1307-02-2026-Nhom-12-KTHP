const { z } = require('zod');

const id = z.coerce.number().int().positive('ID is invalid');
const role = z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER']);
const tableStatus = z.enum(['AVAILABLE', 'OCCUPIED']);
const station = z.enum(['GRILL', 'BAR', 'COLD']);
const imageDataUrl = z.string()
  .regex(/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/i, 'Image must be an HTTP(S) URL or a JPEG/PNG Base64 data URL');
const imageValue = z.union([
  z.string().url().max(2048),
  imageDataUrl,
]);
const optionalImageValue = imageValue.optional().nullable();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD');
const emptySchema = z.object({
  body: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
  params: z.object({}).strict().optional(),
});

const idParamSchema = z.object({
  params: z.object({ id }),
});

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(100),
    full_name: z.string().min(2).max(255),
    role,
  }),
});

const updateUserSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    email: z.string().email().max(255).optional(),
    full_name: z.string().min(2).max(255).optional(),
    role: role.optional(),
    is_active: z.boolean().optional(),
  }),
});

const createTableSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50),
    zone: z.string().min(1).max(50),
    capacity: z.coerce.number().int().min(1).max(20),
    status: tableStatus.optional(),
  }),
});

const updateTableSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    zone: z.string().min(1).max(50).optional(),
    capacity: z.coerce.number().int().min(1).max(20).optional(),
    status: tableStatus.optional(),
  }),
});

const listQrCodesSchema = z.object({
  query: z.object({
    table_id: id.optional(),
  }),
});

const createQrCodeSchema = z.object({
  body: z.object({
    table_id: id,
    code: z.string().min(1).max(100).optional(),
    is_active: z.boolean().optional(),
  }),
});

const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    station,
    sort_order: z.coerce.number().int().nonnegative().optional(),
    is_active: z.boolean().optional(),
  }),
});

const updateCategorySchema = z.object({
  params: z.object({ id }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    station: station.optional(),
    sort_order: z.coerce.number().int().nonnegative().optional(),
    is_active: z.boolean().optional(),
  }),
});

const listItemsSchema = z.object({
  query: z.object({
    category_id: id.optional(),
  }),
});

const revenueReportSchema = z.object({
  query: z.object({
    from: dateOnly,
    to: dateOnly,
    group_by: z.enum(['day', 'week', 'month']).optional(),
  }),
});

const exportReportSchema = z.object({
  query: z.object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  }),
});

const createItemSchema = z.object({
  body: z.object({
    category_id: id,
    name: z.string().min(2).max(255),
    price: z.coerce.number().positive(),
    image_url: optionalImageValue,
    daily_quota: z.coerce.number().int().nonnegative().optional(),
    daily_quota_default: z.coerce.number().int().nonnegative().optional(),
    sort_order: z.coerce.number().int().nonnegative().optional(),
    is_available: z.boolean().optional(),
  }),
});

const updateItemSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    category_id: id.optional(),
    name: z.string().min(2).max(255).optional(),
    price: z.coerce.number().positive().optional(),
    image_url: optionalImageValue,
    daily_quota: z.coerce.number().int().nonnegative().optional(),
    daily_quota_default: z.coerce.number().int().nonnegative().optional(),
    sort_order: z.coerce.number().int().nonnegative().optional(),
    is_available: z.boolean().optional(),
  }),
});

const uploadBase64MenuImageSchema = z.object({
  body: z.object({
    image_base64: z.string().trim().min(1, 'Dish image data is required'),
    filename: z.string().trim().min(1).max(255).optional(),
  }).strict(),
});

const menuItemIdParamSchema = z.object({
  params: z.object({ id }),
});

const createOptionSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    option_group: z.string().min(1).max(100),
    option_name: z.string().min(1).max(100),
    extra_price: z.coerce.number().nonnegative().optional(),
    is_available: z.boolean().optional(),
  }),
});

const updateOptionSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    option_group: z.string().min(1).max(100).optional(),
    option_name: z.string().min(1).max(100).optional(),
    extra_price: z.coerce.number().nonnegative().optional(),
    is_available: z.boolean().optional(),
  }),
});

const saveBankSettingsSchema = z.object({
  body: z.object({
    bank_id: z.string().min(1, 'Mã ngân hàng không được để trống'),
    account_number: z.string().regex(/^[A-Za-z0-9]+$/, 'Số tài khoản chỉ được chứa chữ cái và số').min(6).max(20),
    account_owner: z.string().min(1, 'Tên chủ tài khoản không được để trống'),
  }),
});

module.exports = {
  idParamSchema,
  createUserSchema,
  updateUserSchema,
  createTableSchema,
  updateTableSchema,
  listQrCodesSchema,
  createQrCodeSchema,
  createCategorySchema,
  updateCategorySchema,
  listItemsSchema,
  createItemSchema,
  updateItemSchema,
  uploadBase64MenuImageSchema,
  menuItemIdParamSchema,
  createOptionSchema,
  updateOptionSchema,
  emptySchema,
  revenueReportSchema,
  exportReportSchema,
  saveBankSettingsSchema,
};
