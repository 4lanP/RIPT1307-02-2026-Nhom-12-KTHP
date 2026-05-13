const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Restaurant QR Ordering System API',
      version: '1.0.0',
      description: 'API documentation for the restaurant QR ordering system.',
      contact: { name: 'Backend Team' },
    },
    servers: [
      { url: 'http://localhost:5000/api', description: 'Local Development' },
      { url: 'https://your-app.onrender.com/api', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        StaffAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Staff access JWT returned by POST /auth/login',
        },
        SessionAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Customer session JWT returned by POST /customer/scan',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              nullable: true,
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            menu_item_id: { type: 'integer' },
            name: { type: 'string' },
            quantity: { type: 'integer' },
            unit_price: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'] },
            options: { type: 'array', items: { type: 'object' } },
          },
        },
        Session: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            table_name: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'CLOSED', 'CANCELLED'] },
            subtotal: { type: 'number' },
            discount_amount: { type: 'number' },
            tax_amount: { type: 'number' },
            final_amount: { type: 'number' },
            started_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'System', description: 'Health check' },
      { name: 'Auth', description: 'Staff login, refresh, logout' },
      { name: 'Customer', description: 'Customer scan, menu, order, payment' },
      { name: 'KDS', description: 'Kitchen Display System' },
      { name: 'Staff', description: 'Cashier and table operations' },
      { name: 'Admin', description: 'Administration and reports' },
      { name: 'Webhooks', description: 'Payment provider callbacks' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
