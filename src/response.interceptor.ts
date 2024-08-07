import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { map } from 'rxjs/operators';
  
  @Injectable()
  export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
    intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Observable<any> {
      return next.handle().pipe(
        map((response: any) => {
          const { message, data } = response;
          return {
            status: 'success',
            message,
            data,
          };
        }),
      );
    }
  }
  