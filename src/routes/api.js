const express = require('express');
const router = express.Router();

// Controller Module Ingestions
const { login } = require('../controllers/authController');
const { getProducts, getProductById, createProduct, deleteProduct } = require('../controllers/productController');
const { addToCart, getCart } = require('../controllers/cartController');
const { placeOrder, getOrderHistory } = require('../controllers/orderController');
const { getDashboardAnalytics } = require('../controllers/analyticsController');
const { getManagementReports } = require('../controllers/reportController');

// Security & Traffic Interception Middlewares
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter');

// ---- DOCUMENTATION INTERFACE INTERACTIVE SCHEMAS ----

const authSchema = {
  post: {
    summary: 'Verify Credentials & Issue JWT (Protected by a 5-request rate limiter)',
    tags: ['Identity Management'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', default: 'tashi@gmail.com' },
              password: { type: 'string', default: 'Password123!' }
            }
          }
        }
      }
    },
    responses: { 200: { description: 'Success' } }
  }
};

const catalogSchema = {
  get: {
    summary: 'Browse Catalog (Full-Text Search & Filtering)',
    tags: ['Core Product Catalog'],
    parameters: [
      { name: 'search', in: 'query', type: 'string' },
      { name: 'category', in: 'query', type: 'string' },
      { name: 'sort', in: 'query', type: 'string', enum: ['price_asc', 'price_desc'] }
    ],
    responses: { 200: { description: 'Success' } },
  },
  post: {
    summary: 'Create a new catalog product (Admin Only)',
    tags: ['Core Product Catalog'],
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'Next-Gen VR Headset' },
              description: { type: 'string', default: 'Ultra-HD spatial immersion system.' },
              category_id: { type: 'string', default: 'replace_with_category_id' },
              tags: { type: 'array', items: { type: 'string' }, default: ['tech', 'new'] },
              variants: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    sku: { type: 'string', default: 'SKU-VR-999-S' },
                    color: { type: 'string', default: 'Cosmic Black' },
                    size: { type: 'string', default: 'Standard' },
                    price: { type: 'number', default: 599.99 }
                  }
                }
              },
              attributes: { type: 'object', default: { resolution: '8K Total', refreshRate: '120Hz' } }
            }
          }
        }
      }
    },
    responses: { 201: { description: 'Created Successfully' } }
  }
};

const itemSchema = {
  get: {
    summary: 'View Single Item (Updates HLL Unique Views & Sorted Set Rankings)',
    tags: ['Core Product Catalog'],
    parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }],
    responses: { 200: { description: 'Success' } }
  },
  delete: {
    summary: 'Remove product from database catalog and cache layers (Admin Only)',
    tags: ['Core Product Catalog'],
    security: [{ BearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, type: 'string' }],
    responses: { 200: { description: 'Deleted Successfully' } }
  }
};

const cartSchema = {
  post: {
    summary: 'Append item to shopping cart (Redis Hash Storage - Customer Only)',
    tags: ['Shopping Cart State Management'],
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              product_id: { type: 'string', default: 'replace_with_id' },
              sku: { type: 'string', default: 'replace_with_sku' },
              quantity: { type: 'integer', default: 1 }
            }
          }
        }
      }
    },
    responses: { 200: { description: 'Success' } },
  },
  get: {
    summary: 'Fetch current shopping cart items from memory states (Customer Only)',
    tags: ['Shopping Cart State Management'],
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: 'Success' } }
  }
};

const checkoutSchema = {
  post: {
    summary: 'Execute Transactional Multi-Document Order Route (Customer Only)',
    tags: ['ACID Order Engine'],
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    product_id: { type: 'string', default: 'id_here' },
                    sku: { type: 'string', default: 'sku_here' },
                    quantity: { type: 'integer', default: 1 }
                  }
                }
              }
            }
          }
        }
      }
    },
    responses: { 201: { description: 'Created' } }
  }
};

const historySchema = {
  get: {
    summary: 'Retrieve historical orders placed by the authorized user account (Customer Only)',
    tags: ['ACID Order Engine'],
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: 'Success' } }
  }
};

const analyticsSchema = {
  get: {
    summary: 'Fetch Real-Time Analytics Dashboard Metrics (Sorted Set + HyperLogLog Counts)',
    tags: ['Real-Time Analytics Core'],
    responses: { 200: { description: 'Success' } }
  }
};

const reportSchema = {
  get: {
    summary: 'Run Complex Sales Aggregations & Low Stock Reports (Admin/Seller Only)',
    tags: ['Management Reporting & Aggregations'],
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: 'Success' } }
  }
};

// ---- ENDPOINT EXECUTION MATCHINGS WITH ROLE-BASED ACCESS CONTROL ----

// Identity Route
router.post('/auth/login', rateLimiter(5, 30), login);

// Public Catalog Access Routes
router.get('/products', getProducts);
router.get('/products/:id', getProductById);

// Admin-Only Catalog Management Operations
router.post('/products', authenticateToken, authorizeRoles('Administrator'), createProduct);
router.delete('/products/:id', authenticateToken, authorizeRoles('Administrator'), deleteProduct);

// Customer-Only Shopping Cart Operations
router.post('/cart', authenticateToken, authorizeRoles('Customer'), addToCart);
router.get('/cart', authenticateToken, authorizeRoles('Customer'), getCart);

// Customer-Only Order Ingestion Pipelines
router.post('/orders', authenticateToken, authorizeRoles('Customer'), placeOrder);
router.get('/orders/history', authenticateToken, authorizeRoles('Customer'), getOrderHistory);

// Real-Time Analytics Stream Access Route
router.get('/analytics/dashboard', authenticateToken, authorizeRoles('Seller', 'Administrator'), getDashboardAnalytics);

// Seller / Admin Management Aggregation Reports Route
router.get('/reports/management', authenticateToken, authorizeRoles('Seller', 'Administrator'), getManagementReports);

// Unified Module Export
module.exports = {
  router,
  schemas: {
    '/api/auth/login': authSchema,
    '/api/products': catalogSchema,
    '/api/products/{id}': itemSchema,
    '/api/cart': cartSchema,
    '/api/orders': checkoutSchema,
    '/api/orders/history': historySchema,
    '/api/analytics/dashboard': analyticsSchema,
    '/api/reports/management': reportSchema
  }
};