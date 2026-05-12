const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Restaurant QR Ordering System API',
      version: '1.0.0',
      description: 'API documentation cho hệ thống gọi món nhà hàng qua QR Code tích hợp KDS real-time.',
      contact: { name: 'Backend Team' }
    },
    servers: [
      { url: 'http://localhost:5000/api', description: 'Local Development' },
      { url: 'https://your-app.onrender.com/api', description: 'Production (Render)' }
    ],
    components: {
      securitySchemes: {
        StaffAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Access Token — lấy từ POST /auth/login'
        },
        SessionAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Session Token (UUID) — lấy từ POST /customer/scan'
        }
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data:    { type: 'object' },
            message: { type: 'string' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            code:    { type: 'integer' }
          }
        },
        OrderItem: {
          type: 'object',
          properties: {
            id:           { type: 'string', format: 'uuid' },
            menu_item_id: { type: 'string', format: 'uuid' },
            name:         { type: 'string' },
            quantity:     { type: 'integer' },
            unit_price:   { type: 'number' },
            status:       { type: 'string', enum: ['PENDING','PREPARING','READY','SERVED','CANCELLED'] },
            options:      { type: 'array', items: { type: 'object' } }
          }
        },
        Session: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid' },
            table_name:      { type: 'string' },
            status:          { type: 'string', enum: ['ACTIVE','CLOSED','CANCELLED'] },
            subtotal:        { type: 'number' },
            discount_amount: { type: 'number' },
            tax_amount:      { type: 'number' },
            final_amount:    { type: 'number' },
            started_at:      { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    tags: [
      { name: 'System',   description: 'Health check' },
      { name: 'Auth',     description: 'Đăng nhập, refresh, logout cho nhân viên' },
      { name: 'Customer', description: 'Luồng khách hàng: scan QR, xem menu, đặt món' },
      { name: 'KDS',      description: 'Kitchen Display System — dành cho bếp' },
      { name: 'Staff',    description: 'Thu ngân và quản lý bàn' },
      { name: 'Admin',    description: 'Quản trị hệ thống và báo cáo' },
      { name: 'Webhooks', description: 'Callback từ VNPay' },
    ]
  },
  apis: ['./src/routes/*.js'],  // Đọc JSDoc comments từ tất cả route files
};

module.exports = swaggerJsdoc(options);
