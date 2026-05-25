const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');
const { requestId, responseTime } = require('./middlewares/requestTracking.middleware');
const logger = require('./utils/logger');
const { dishImageStorage } = require('./config/storage');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Request tracking middlewares
app.use(requestId);
app.use(responseTime);

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(dishImageStorage.publicPath, express.static(path.resolve(dishImageStorage.directory)));

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

app.use('/api', routes);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Restaurant API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

app.use(errorHandler);

module.exports = app;
