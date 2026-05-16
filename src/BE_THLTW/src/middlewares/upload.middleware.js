const { ValidationError } = require('../utils/errors');
const { dishImageStorage } = require('../config/storage');

let multer = null;
try {
  multer = require('multer');
} catch {
  multer = null;
}

function validationError(message) {
  return new ValidationError('Du lieu khong hop le', [
    { field: 'body.image', message },
  ]);
}

function formatMaxSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  }
  return `${bytes} bytes`;
}

function splitBuffer(buffer, separator) {
  const parts = [];
  let start = 0;
  let index = buffer.indexOf(separator, start);

  while (index !== -1) {
    parts.push(buffer.subarray(start, index));
    start = index + separator.length;
    index = buffer.indexOf(separator, start);
  }

  parts.push(buffer.subarray(start));
  return parts;
}

function parseContentDisposition(header) {
  const result = {};
  header.split(';').forEach((part) => {
    const [key, rawValue] = part.trim().split('=');
    if (!rawValue) return;
    result[key] = rawValue.replace(/^"|"$/g, '');
  });
  return result;
}

function fallbackSingleFile(fieldName) {
  return (req, _res, next) => {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

    if (!boundaryMatch) {
      return next();
    }

    const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
    const chunks = [];
    let totalBytes = 0;

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > dishImageStorage.maxBytes + 1024 * 1024) {
        req.destroy(validationError(`Dish image must be ${formatMaxSize(dishImageStorage.maxBytes)} or smaller`));
        return;
      }
      chunks.push(chunk);
    });

    req.on('error', next);

    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const parts = splitBuffer(body, boundary);

        for (const rawPart of parts) {
          let part = rawPart;
          if (part.subarray(0, 2).toString() === '\r\n') {
            part = part.subarray(2);
          }
          if (part.subarray(0, 2).toString() === '--') {
            continue;
          }

          const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
          if (headerEnd === -1) continue;

          const headers = part.subarray(0, headerEnd).toString('utf8');
          let content = part.subarray(headerEnd + 4);
          if (content.subarray(content.length - 2).toString() === '\r\n') {
            content = content.subarray(0, content.length - 2);
          }

          const dispositionHeader = headers
            .split('\r\n')
            .find((line) => line.toLowerCase().startsWith('content-disposition:'));
          if (!dispositionHeader) continue;

          const disposition = parseContentDisposition(dispositionHeader.split(':').slice(1).join(':'));
          if (disposition.name !== fieldName || !disposition.filename) continue;

          const typeHeader = headers
            .split('\r\n')
            .find((line) => line.toLowerCase().startsWith('content-type:'));

          req.file = {
            fieldname: fieldName,
            originalname: disposition.filename,
            mimetype: typeHeader ? typeHeader.split(':').slice(1).join(':').trim() : 'application/octet-stream',
            size: content.length,
            buffer: content,
          };
          break;
        }

        return next();
      } catch (error) {
        return next(error);
      }
    });
  };
}

function createDishImageUpload() {
  if (!multer) {
    return fallbackSingleFile('image');
  }

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: dishImageStorage.maxBytes,
      files: 1,
    },
  }).single('image');

  return (req, res, next) => {
    upload(req, res, (error) => {
      if (!error) return next();

      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return next(validationError(`Dish image must be ${formatMaxSize(dishImageStorage.maxBytes)} or smaller`));
        }
        return next(validationError('Exactly one dish image file is allowed'));
      }

      return next(error);
    });
  };
}

module.exports = {
  createDishImageUpload,
};
