'use strict';

class ApplicationError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'ApplicationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

class NotFoundError extends ApplicationError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ValidationError extends ApplicationError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class AuthorizationError extends ApplicationError {
  constructor(message = 'Unauthorized') {
    super(message, 403, 'FORBIDDEN');
  }
}

module.exports = { ApplicationError, NotFoundError, ValidationError, AuthorizationError };
