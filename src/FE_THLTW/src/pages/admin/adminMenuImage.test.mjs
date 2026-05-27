import assert from 'node:assert/strict';
import {
  buildImagePreviewSrc,
  getImageInputValidationMessage,
  isBase64ImageInput,
  resolveMenuImageUrl,
  shouldUploadImageValue,
} from './adminMenuImage.js';

const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAA==';
const rawPngBase64 = 'iVBORw0KGgoAAA==';
const externalUrl = 'https://example.com/dish.png';

assert.equal(isBase64ImageInput(pngDataUrl), true);
assert.equal(isBase64ImageInput(rawPngBase64), true);
assert.equal(isBase64ImageInput(externalUrl), false);
assert.equal(shouldUploadImageValue(pngDataUrl), true);
assert.equal(shouldUploadImageValue(externalUrl), false);

assert.equal(buildImagePreviewSrc(pngDataUrl), pngDataUrl);
assert.equal(buildImagePreviewSrc(rawPngBase64), pngDataUrl);
assert.equal(buildImagePreviewSrc(externalUrl), externalUrl);
assert.equal(buildImagePreviewSrc('data:image/png;base64,not@@base64'), '');
assert.match(getImageInputValidationMessage('data:image/png;base64,not@@base64'), /Base64/);
assert.equal(getImageInputValidationMessage(externalUrl), '');

let uploadedPayload = null;
const uploadedUrl = await resolveMenuImageUrl(pngDataUrl, async (payload) => {
  uploadedPayload = payload;
  return { data: { url: 'http://localhost:5000/uploads/dish-images/menu-items/2026/05/dish.png' } };
});
assert.deepEqual(uploadedPayload, { image_base64: pngDataUrl });
assert.equal(uploadedUrl, 'http://localhost:5000/uploads/dish-images/menu-items/2026/05/dish.png');

const preservedUrl = await resolveMenuImageUrl(externalUrl, async () => {
  throw new Error('external URLs must not be uploaded first');
});
assert.equal(preservedUrl, externalUrl);

await assert.rejects(
  () => resolveMenuImageUrl('data:image/png;base64,not@@base64', async () => ({ data: { url: 'bad' } })),
  /Base64/
);
