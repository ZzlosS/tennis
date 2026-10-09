import { NextFunction, Request, Response } from "express";
import { ZodError, ZodTypeAny } from "zod";
import { FieldErrors, ValidationError } from "../errors/appError";

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
}

const toFields = (error: ZodError): FieldErrors => {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
};

// Replaces req.body / req.query with the parsed value, so unknown keys never reach a controller.
export function validate(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const part of ["body", "query"] as const) {
      const schema = schemas[part];
      if (!schema) {
        continue;
      }
      const result = schema.safeParse(req[part]);
      if (!result.success) {
        return next(new ValidationError("Validation failed", toFields(result.error)));
      }
      if (part === "body") {
        req.body = result.data;
      } else {
        // req.query is a getter-only property on newer Express versions, so it is re-defined.
        Object.defineProperty(req, "query", { value: result.data, writable: true, configurable: true });
      }
    }
    next();
  };
}
