import { ErrorCode } from "./codes";

export type FieldErrors = Record<string, string[]>;

// Error object used in error handling middleware function
export default class AppError extends Error {
  statusCode: number;
  code: ErrorCode;
  fields?: FieldErrors;

  constructor(statusCode: number, code: ErrorCode, message: string, fields?: FieldErrors) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    Error.captureStackTrace(this);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Not Found") {
    super(404, ErrorCode.NOT_FOUND, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", fields?: FieldErrors) {
    super(400, ErrorCode.VALIDATION_FAILED, message, fields);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required", code: ErrorCode = ErrorCode.UNAUTHENTICATED) {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Not allowed") {
    super(403, ErrorCode.FORBIDDEN, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflict", code: ErrorCode = ErrorCode.CONFLICT) {
    super(409, code, message);
  }
}
