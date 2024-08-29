import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Verifica se o tipo de resposta é JSON
    if (request.headers['accept']?.includes('application/json')) {
      return next.handle().pipe(
        map((response: any) => {
          const { message, data, log } = response;
          return {
            status: 'success',
            message,
            log,
            data,
          };
        }),
      );
    }

    // Se a resposta não for JSON, passa pelo interceptor sem modificações
    return next.handle();
  }
}
