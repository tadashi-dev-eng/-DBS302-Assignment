const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();
app.use(express.json());

// Initialize Database Storage Connectors
connectDB();
require('./config/redis');

// Import our API router module details
const apiModule = require('./routes/api');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tashi Shop',
      version: '1.0.0',
      description: 'Interactive API documentation for testing MongoDB & Redis data layer integration.',
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 5000}` }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your signed JWT token to authenticate requests across restricted endpoints.'
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    // Inject the javascript endpoints directly into the specification map
    paths: apiModule.schemas 
  },
  apis: [], // Disables file string scanning to prevent parsing errors
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Bind Routing Middleware
app.use('/api', apiModule.router);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Interactive Documentation ready at http://localhost:${PORT}/api-docs`);
});