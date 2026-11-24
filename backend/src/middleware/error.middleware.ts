
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export function errorMiddleware(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = error instanceof AppError ? error.statusCode : 500;

  res.status(status).json({
    success: false,
    message: error.message || "Internal server error"
  });
}
