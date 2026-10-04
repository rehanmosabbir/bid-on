import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi";

export function mountSwagger(app: Express) {
  app.get("/api/docs.json", (_req, res) => {
    res.json(openApiDocument);
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: "Bid On API Docs",
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );
}
