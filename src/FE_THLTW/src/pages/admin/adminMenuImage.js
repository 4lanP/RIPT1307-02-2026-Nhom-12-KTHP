const DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/i;
const EXTERNAL_IMAGE_URL_PATTERN = /^https?:\/\/\S+$/i;

function normalizeBase64Payload(value) {
  return String(value || '').replace(/\s+/g, '');
}

function isValidBase64Payload(value) {
  const normalized = normalizeBase64Payload(value);
  if (
    !normalized ||
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) ||
    /=[A-Za-z0-9+/]/.test(normalized)
  ) {
    return false;
  }

  try {
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    return decoded.length > 0 && btoa(decoded).replace(/=+$/, '') === normalized.replace(/=+$/, '');
  } catch {
    return false;
  }
}

function getRawBase64MimeType(value) {
  const normalized = normalizeBase64Payload(value).replace(/=+$/, '');
  if (normalized.startsWith('/9j/')) return 'image/jpeg';
  if (normalized.startsWith('iVBORw0KGgo')) return 'image/png';
  if (normalized.startsWith('UklGR')) return 'image/webp';
  return '';
}

export function isExternalImageUrl(value) {
  return EXTERNAL_IMAGE_URL_PATTERN.test(String(value || '').trim());
}

export function isImageDataUrl(value) {
  const trimmed = String(value || '').trim();
  const match = trimmed.match(DATA_URL_PATTERN);
  return Boolean(match && isValidBase64Payload(match[2]));
}

export function isBase64ImageInput(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || isExternalImageUrl(trimmed)) return false;
  if (isImageDataUrl(trimmed)) return true;
  return isValidBase64Payload(trimmed) && Boolean(getRawBase64MimeType(trimmed));
}

export function shouldUploadImageValue(value) {
  return isBase64ImageInput(value);
}

export function buildImagePreviewSrc(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (isExternalImageUrl(trimmed)) return trimmed;
  if (isImageDataUrl(trimmed)) return trimmed;

  if (isValidBase64Payload(trimmed)) {
    const mimeType = getRawBase64MimeType(trimmed);
    if (mimeType) {
      return `data:${mimeType};base64,${normalizeBase64Payload(trimmed)}`;
    }
  }

  return '';
}

export function getImageInputValidationMessage(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || buildImagePreviewSrc(trimmed)) return '';

  if (trimmed.toLowerCase().startsWith('data:image/')) {
    return 'Dữ liệu Base64 ảnh chưa hợp lệ';
  }

  if (isValidBase64Payload(trimmed)) {
    return 'Dữ liệu Base64 phải là ảnh JPEG, PNG hoặc WebP';
  }

  return 'Vui lòng nhập URL ảnh hợp lệ hoặc dữ liệu Base64 ảnh';
}

export async function resolveMenuImageUrl(value, uploadBase64MenuImage) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (isExternalImageUrl(trimmed)) return trimmed;

  const validationMessage = getImageInputValidationMessage(trimmed);
  if (validationMessage) {
    throw new Error(validationMessage);
  }

  if (!shouldUploadImageValue(trimmed)) {
    return trimmed;
  }

  const response = await uploadBase64MenuImage({ image_base64: trimmed });
  const url = response?.data?.url || response?.url;
  if (!url) {
    throw new Error('Không nhận được URL ảnh sau khi tải lên');
  }
  return url;
}
