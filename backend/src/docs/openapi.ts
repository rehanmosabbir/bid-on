/** OpenAPI 3.0 document for Swagger UI at /api/docs */
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Bid On API",
    version: "1.0.0",
    description:
      "Online auction API. Authenticated routes need `Authorization: Bearer <token>` from login/register/verify.",
  },
  servers: [
    { url: "/", description: "Current host" },
    { url: "http://localhost:4000", description: "Local development" },
  ],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Users" },
    { name: "Categories" },
    { name: "Auctions" },
    { name: "Bids" },
    { name: "Watchlist" },
    { name: "Notifications" },
    { name: "Reviews" },
    { name: "Payments" },
    { name: "Admin" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["buyer", "seller", "admin"] },
          verified: { type: "boolean" },
          ratingAvg: { type: "number" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    service: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/search": {
      get: {
        tags: ["Auctions"],
        summary: "Search (redirects to /api/auctions)",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: { "307": { description: "Redirect to auctions list" } },
      },
    },

    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password", "role"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  role: { type: "string", enum: ["buyer", "seller"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Registered; verification email/link sent" },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/auth/verify": {
      post: {
        tags: ["Auth"],
        summary: "Verify email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: { token: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Verified",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
          },
        },
      },
    },
    "/api/auth/resend-otp": {
      post: {
        tags: ["Auth"],
        summary: "Resend verification email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: { "200": { description: "Sent if account exists" } },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Logged in",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
          },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (clears cookie)",
        responses: { "200": { description: "Logged out" } },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: { "200": { description: "OTP sent if account exists" } },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password with OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  otp: { type: "string" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Password updated" } },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/User" } },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },

    "/api/users/me": {
      patch: {
        tags: ["Users"],
        summary: "Update profile / switch buyer-seller role",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  address: { type: "string" },
                  role: { type: "string", enum: ["buyer", "seller"] },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Updated user" } },
      },
    },
    "/api/users/me/bids": {
      get: {
        tags: ["Users"],
        summary: "My bids",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Bid list" } },
      },
    },
    "/api/users/me/listings": {
      get: {
        tags: ["Users"],
        summary: "My listings",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Auction list" } },
      },
    },
    "/api/users/me/transactions": {
      get: {
        tags: ["Users"],
        summary: "My transactions",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Transaction list" } },
      },
    },

    "/api/categories": {
      get: {
        tags: ["Categories"],
        summary: "List categories",
        responses: { "200": { description: "Categories" } },
      },
      post: {
        tags: ["Categories"],
        summary: "Create category (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  slug: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Created" }, "403": { description: "Forbidden" } },
      },
    },

    "/api/auctions": {
      get: {
        tags: ["Auctions"],
        summary: "List / filter auctions",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "sort", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Auction list" } },
      },
      post: {
        tags: ["Auctions"],
        summary: "Create auction (multipart; seller)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["title", "description", "startPrice", "endsAt"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  startPrice: { type: "number" },
                  reservePrice: { type: "number" },
                  maxPriceCap: { type: "number" },
                  categoryId: { type: "string" },
                  startsAt: { type: "string", format: "date-time" },
                  endsAt: { type: "string", format: "date-time" },
                  images: { type: "array", items: { type: "string", format: "binary" } },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Created (pending approval)" } },
      },
    },
    "/api/auctions/{id}": {
      get: {
        tags: ["Auctions"],
        summary: "Get auction by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Auction" }, "404": { description: "Not found" } },
      },
      patch: {
        tags: ["Auctions"],
        summary: "Update auction (owner)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated" } },
      },
    },
    "/api/auctions/{id}/approve": {
      post: {
        tags: ["Auctions"],
        summary: "Approve auction (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Approved" } },
      },
    },
    "/api/auctions/{id}/reject": {
      post: {
        tags: ["Auctions"],
        summary: "Reject auction (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Rejected" } },
      },
    },
    "/api/auctions/{id}/bids": {
      get: {
        tags: ["Bids"],
        summary: "List bids for auction",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Bids" } },
      },
      post: {
        tags: ["Bids"],
        summary: "Place a bid",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["amount"],
                properties: { amount: { type: "number" } },
              },
            },
          },
        },
        responses: { "200": { description: "Bid placed" }, "400": { description: "Invalid bid" } },
      },
    },

    "/api/watchlist": {
      get: {
        tags: ["Watchlist"],
        summary: "My watchlist",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Watchlist" } },
      },
    },
    "/api/watchlist/{auctionId}": {
      post: {
        tags: ["Watchlist"],
        summary: "Add to watchlist",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "auctionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Added" } },
      },
      delete: {
        tags: ["Watchlist"],
        summary: "Remove from watchlist",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "auctionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Removed" } },
      },
    },

    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "My notifications",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Notifications" } },
      },
    },
    "/api/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all read",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark one read",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
    },

    "/api/reviews": {
      post: {
        tags: ["Reviews"],
        summary: "Leave a review",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["auctionId", "rating"],
                properties: {
                  auctionId: { type: "string" },
                  rating: { type: "integer", minimum: 1, maximum: 5 },
                  comment: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Created" } },
      },
    },

    "/api/payments/create-checkout-session": {
      post: {
        tags: ["Payments"],
        summary: "Start Stripe checkout (or simulate)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["auctionId"],
                properties: { auctionId: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Checkout URL / session" } },
      },
    },
    "/api/payments/session-status": {
      get: {
        tags: ["Payments"],
        summary: "Checkout session status",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "session_id", in: "query", schema: { type: "string" } },
          { name: "auctionId", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Status" } },
      },
    },
    "/api/payments/webhook": {
      post: {
        tags: ["Payments"],
        summary: "Stripe webhook",
        description: "Raw body + Stripe-Signature header. Not for manual Swagger try-out.",
        responses: { "200": { description: "Received" }, "400": { description: "Invalid signature" } },
      },
    },

    "/api/admin/stats": {
      get: {
        tags: ["Admin"],
        summary: "Admin KPIs",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Stats" }, "403": { description: "Forbidden" } },
      },
    },
    "/api/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List users",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Users" } },
      },
    },
    "/api/admin/users/{id}/suspend": {
      patch: {
        tags: ["Admin"],
        summary: "Suspend / unsuspend user",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { suspended: { type: "boolean" } },
              },
            },
          },
        },
        responses: { "200": { description: "Updated" } },
      },
    },
    "/api/admin/auctions": {
      get: {
        tags: ["Admin"],
        summary: "Admin auction list",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Auctions" } },
      },
    },
    "/api/admin/reports/csv": {
      get: {
        tags: ["Admin"],
        summary: "CSV report export",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "CSV file",
            content: { "text/csv": { schema: { type: "string" } } },
          },
        },
      },
    },
  },
} as const;
