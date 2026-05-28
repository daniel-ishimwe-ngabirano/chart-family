import { ZodSchema, ZodError } from "zod";
import { AppError } from "../middleware/errorHandler.js";

export function validateSocketEvent<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      throw new AppError(messages, 400);
    }
    throw error;
  }
}
