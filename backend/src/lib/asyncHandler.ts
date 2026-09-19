import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: err.issues.map((i) => i.message).join(", ") || "Validation error",
    });
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  const status =
    message.includes("Authentication") || message.includes("token")
      ? 401
      : message.includes("suspended") || message.includes("permissions")
        ? 403
        : message.includes("not found")
          ? 404
          : message.includes("Invalid") ||
              message.includes("required") ||
              message.includes("must be") ||
              message.includes("Cannot") ||
              message.includes("exceeds") ||
              message.includes("not live") ||
              message.includes("ended")
            ? 400
            : 500;
  res.status(status).json({ error: message });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
