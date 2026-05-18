process.env.DISH_IMAGE_STORAGE_DIR = '/tmp/kthp-dish-image-static-tests';
process.env.DISH_IMAGE_PUBLIC_BASE_URL = 'http://localhost:5000/uploads/dish-images';

require('./helpers/mockDb');

const fs = require('fs/promises');
const path = require('path');
const app = require('../src/app');

function get(pathname) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
        resolve(response);
      } catch (error) {
        reject(error);
      } finally {
        server.close();
      }
    });
  });
}

describe('Static dish image serving', () => {
  beforeEach(async () => {
    await fs.rm(process.env.DISH_IMAGE_STORAGE_DIR, { recursive: true, force: true });
    await fs.mkdir(process.env.DISH_IMAGE_STORAGE_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(process.env.DISH_IMAGE_STORAGE_DIR, { recursive: true, force: true });
  });

  it('allows uploaded dish images to be embedded by the frontend origin', async () => {
    await fs.writeFile(path.join(process.env.DISH_IMAGE_STORAGE_DIR, 'dish.png'), Buffer.from('image'));

    const response = await get('/uploads/dish-images/dish.png');

    expect(response.status).toBe(200);
    expect(response.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
  });
});
