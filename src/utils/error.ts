export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const createError = (statusCode: number, message: string) => {
  return new AppError(statusCode, message);
};

export const handleError = (error: Error) => {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      message: error.message,
      isOperational: error.isOperational
    };
  }

  // Error no operacional (error interno)
  return {
    status: 500,
    message: 'Error interno del servidor',
    isOperational: false
  };
}; 