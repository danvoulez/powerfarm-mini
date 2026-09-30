export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(kind: string, id: string) {
    super(404, "not_found", `${kind} not found: ${id}`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, "conflict", message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(capability: string) {
    super(403, "forbidden", `Missing required capability: ${capability}`);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, "validation_error", message, details);
  }
}
