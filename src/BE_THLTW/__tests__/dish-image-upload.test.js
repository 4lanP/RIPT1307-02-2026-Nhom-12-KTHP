process.env.DISH_IMAGE_STORAGE_DIR = '/tmp/kthp-dish-image-upload-tests';
process.env.DISH_IMAGE_PUBLIC_BASE_URL = 'http://localhost:5000/uploads/dish-images';
process.env.DISH_IMAGE_MAX_BYTES = '64';

require('./helpers/mockDb');

const express = require('express');
const fs = require('fs/promises');
const jwtUtil = require('../src/utils/jwt.util');
const { mockPool } = require('./helpers/mockDb');
const errorHandler = require('../src/middlewares/error.middleware');
const adminRoutes = require('../src/routes/admin.routes');

jest.mock('../src/utils/jwt.util');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRoutes);
  app.use(errorHandler);
  return app;
}

function validPngBuffer(extraBytes = 8) {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(extraBytes, 0),
  ]);
}

async function request(app, method, path, role, options = {}) {
  if (role) {
    jwtUtil.verifyAccessToken.mockReturnValue({ id: 1 });
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, role, is_active: true }],
    });
  }

  (options.dbResponses || []).forEach((response) => {
    mockPool.query.mockResolvedValueOnce(response);
  });

  const headers = {};
  if (role) {
    headers.authorization = `Bearer ${role.toLowerCase()}-token`;
  }

  if (options.json) {
    headers['content-type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers,
          body: options.form || (options.json ? JSON.stringify(options.json) : undefined),
        });
        const body = await response.json();
        resolve({ status: response.status, body });
      } catch (error) {
        reject(error);
      } finally {
        server.close();
      }
    });
  });
}

function imageForm(buffer = validPngBuffer(), filename = 'dish.png', type = 'image/png') {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type }), filename);
  return form;
}

describe('Dish image upload', () => {
  let app;

  beforeEach(async () => {
    app = createApp();
    jwtUtil.verifyAccessToken.mockReset();
    await fs.rm(process.env.DISH_IMAGE_STORAGE_DIR, { recursive: true, force: true });
  });

  afterAll(async () => {
    await fs.rm(process.env.DISH_IMAGE_STORAGE_DIR, { recursive: true, force: true });
  });

  it.each(['ADMIN', 'MANAGER'])('uploads a valid image for %s and returns a URL plus object key', async (role) => {
    const response = await request(app, 'POST', '/admin/menu/images', role, {
      form: imageForm(),
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({ success: true }));
    expect(response.body.data).toEqual(expect.objectContaining({
      url: expect.stringMatching(/^http:\/\/localhost:5000\/uploads\/dish-images\/menu-items\/\d{4}\/\d{2}\/.+\.png$/),
      object_key: expect.stringMatching(/^menu-items\/\d{4}\/\d{2}\/.+\.png$/),
      mime_type: 'image/png',
      size_bytes: 16,
    }));

    const storedFile = `${process.env.DISH_IMAGE_STORAGE_DIR}/${response.body.data.object_key}`;
    await expect(fs.access(storedFile)).resolves.toBeUndefined();
  });

  it('allows a returned upload URL to be saved as menu item image_url on create', async () => {
    const imageUrl = 'http://localhost:5000/uploads/dish-images/menu-items/2026/05/test.png';
    const response = await request(app, 'POST', '/admin/menu/items', 'MANAGER', {
      json: {
        category_id: 1,
        name: 'Pho Bo',
        price: 75000,
        image_url: imageUrl,
      },
      dbResponses: [{ rows: [{ id: 10, image_url: imageUrl }] }],
    });

    expect(response.status).toBe(201);
    expect(mockPool.query.mock.calls[1][1][3]).toBe(imageUrl);
  });

  it('preserves image_url validation when updating a menu item', async () => {
    const imageUrl = 'http://localhost:5000/uploads/dish-images/menu-items/2026/05/updated.png';
    const response = await request(app, 'PUT', '/admin/menu/items/10', 'ADMIN', {
      json: { image_url: imageUrl },
      dbResponses: [{ rows: [{ id: 10, image_url: imageUrl }] }],
    });

    expect(response.status).toBe(200);
    expect(mockPool.query.mock.calls[1][1]).toContain(imageUrl);
  });

  it('rejects missing image files', async () => {
    const response = await request(app, 'POST', '/admin/menu/images', 'MANAGER', {
      form: new FormData(),
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(Array.isArray(response.body.errors)).toBe(true);
  });

  it('rejects unsupported file types', async () => {
    const response = await request(app, 'POST', '/admin/menu/images', 'MANAGER', {
      form: imageForm(Buffer.from('not an image'), 'note.txt', 'text/plain'),
    });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].message).toMatch(/JPEG, PNG, and WebP/);
  });

  it('rejects oversized files before returning an image reference', async () => {
    const response = await request(app, 'POST', '/admin/menu/images', 'MANAGER', {
      form: imageForm(validPngBuffer(80)),
    });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].message).toMatch(/64 bytes/);
  });

  it('rejects malformed image content even when extension and content type look valid', async () => {
    const response = await request(app, 'POST', '/admin/menu/images', 'MANAGER', {
      form: imageForm(Buffer.from('not really png bytes'), 'dish.png', 'image/png'),
    });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].message).toMatch(/JPEG, PNG, and WebP/);
  });

  it.each(['CASHIER', 'WAITER', 'KITCHEN'])('rejects %s uploads with authorization failure', async (role) => {
    const response = await request(app, 'POST', '/admin/menu/images', role, {
      form: imageForm(),
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(expect.objectContaining({ success: false }));
  });

  it('rejects unauthenticated uploads', async () => {
    const response = await request(app, 'POST', '/admin/menu/images', null, {
      form: imageForm(),
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(expect.objectContaining({ success: false }));
  });
});
