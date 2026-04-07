import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status = this.resolveStatus(exception);

    response.status(status).json({
      statusCode: status,
      error: this.resolveError(exception, status),
      message: this.resolveMessage(exception),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolveStatus(exception: unknown) {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveMessage(exception: unknown) {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      if (typeof payload === 'string' || Array.isArray(payload)) {
        return payload;
      }

      if (payload && typeof payload === 'object' && 'message' in payload) {
        return (
          (payload as { message?: string | string[] }).message ??
          exception.message
        );
      }

      return exception.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Erro interno do servidor.';
  }

  private resolveError(exception: unknown, status: number) {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      if (payload && typeof payload === 'object' && 'error' in payload) {
        return (payload as { error?: string }).error ?? exception.name;
      }

      return exception.name;
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Internal Server Error';
    }

    return 'Error';
  }
}
