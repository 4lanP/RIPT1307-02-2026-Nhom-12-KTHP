const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// API Routes
app.use('/api', routes);

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Restaurant API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  }));
}
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// Global Error Handler
app.use(errorHandler);

module.exports = app;
