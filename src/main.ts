import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config'
import { ResponseInterceptor } from './response.interceptor';
import { ValidationPipe } from '@nestjs/common';
// console.log(process.env.MYSQL_HOST);
// console.log(process.env.MYSQL_USER);


// console.log(process.env.MYSQL_DATABASE);
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  await app.listen(process.env.PORT);
}
bootstrap();
 