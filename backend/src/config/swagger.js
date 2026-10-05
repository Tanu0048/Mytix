import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MyTix Event Ticketing Backend API",
      version: "1.0.0",
      description: "Backend REST API for Australian Event Ticketing Platform"
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1 base"
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "access_token"
        }
      }
    }
  },
  apis: ["./src/modules/**/*.routes.js"]
};

export const swaggerSpec = swaggerJsdoc(options);
