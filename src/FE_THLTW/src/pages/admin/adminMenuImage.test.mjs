import assert from 'node:assert/strict';
import {
  buildImagePreviewSrc,
  getImageInputValidationMessage,
  isBase64ImageInput,
  resolveMenuImageUrl,
  shouldUploadImageValue,
} from './adminMenuImage.js';

const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAA==';
const jpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAAAAAAAAAAA=';
const webpDataUrl = 'data:image/webp;base64,UklGRgAAAABXRUJQAAA=';
const rawPngBase64 = 'iVBORw0KGgoAAA==';
const externalUrl = 'https://example.com/dish.png';

assert.equal(isBase64ImageInput(pngDataUrl), true);
assert.equal(isBase64ImageInput(jpegDataUrl), true);
assert.equal(isBase64ImageInput(rawPngBase64), true);
assert.equal(isBase64ImageInput(webpDataUrl), false);
assert.equal(isBase64ImageInput(externalUrl), false);
assert.equal(shouldUploadImageValue(pngDataUrl), true);
assert.equal(shouldUploadImageValue(externalUrl), false);

assert.equal(buildImagePreviewSrc(pngDataUrl), pngDataUrl);
assert.equal(buildImagePreviewSrc(jpegDataUrl), jpegDataUrl);
assert.equal(buildImagePreviewSrc(rawPngBase64), pngDataUrl);
assert.equal(buildImagePreviewSrc(externalUrl), externalUrl);
assert.equal(buildImagePreviewSrc(webpDataUrl), '');
assert.equal(buildImagePreviewSrc('data:image/png;base64,not@@base64'), '');
assert.match(getImageInputValidationMessage('data:image/png;base64,not@@base64'), /Base64/);
assert.match(getImageInputValidationMessage(webpDataUrl), /JPEG hoặc PNG/);
assert.equal(getImageInputValidationMessage(externalUrl), '');

let uploadedPayload = null;
const uploadedUrl = await resolveMenuImageUrl(pngDataUrl, async (payload) => {
  uploadedPayload = payload;
  return { data: { image_url: pngDataUrl } };
});
assert.deepEqual(uploadedPayload, { image_base64: pngDataUrl });
assert.equal(uploadedUrl, pngDataUrl);

const preservedUrl = await resolveMenuImageUrl(externalUrl, async () => {
  throw new Error('external URLs must not be uploaded first');
});
assert.equal(preservedUrl, externalUrl);

await assert.rejects(
  () => resolveMenuImageUrl('data:image/png;base64,not@@base64', async () => ({ data: { url: 'bad' } })),
  /Base64/
);
