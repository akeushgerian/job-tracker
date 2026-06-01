/**
 * Domain errors carry an HTTP status and a stable machine-readable code.
 * The global error handler maps any AppError to its status; unknown errors
 * become a 500.
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code: string = 'UNAUTHORIZED';

  constructor(message = 'Authentication required') {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';

  constructor(message = 'You do not have access to this resource') {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code: string = 'NOT_FOUND';
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';
}

// --- Specific domain errors ---

export class EmailAlreadyInUseError extends ConflictError {
  constructor(email: string) {
    super(`An account with email "${email}" already exists`);
  }
}

export class InvalidCredentialsError extends UnauthorizedError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Invalid email or password');
  }
}

export class ApplicationNotFoundError extends NotFoundError {
  readonly code = 'APPLICATION_NOT_FOUND';

  constructor(id: string) {
    super(`Application "${id}" was not found`);
  }
}

export class InterviewNotFoundError extends NotFoundError {
  readonly code = 'INTERVIEW_NOT_FOUND';

  constructor(id: string) {
    super(`Interview "${id}" was not found`);
  }
}

export class ContactNotFoundError extends NotFoundError {
  readonly code = 'CONTACT_NOT_FOUND';

  constructor(id: string) {
    super(`Contact "${id}" was not found`);
  }
}

export class FollowUpNotFoundError extends NotFoundError {
  readonly code = 'FOLLOW_UP_NOT_FOUND';

  constructor(id: string) {
    super(`Follow-up "${id}" was not found`);
  }
}

export class InvalidStatusTransitionError extends AppError {
  readonly statusCode = 422;
  readonly code = 'INVALID_STATUS_TRANSITION';

  constructor(from: string, to: string) {
    super(`Cannot transition application from "${from}" to "${to}"`);
  }
}
