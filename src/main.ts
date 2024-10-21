
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config'
import { ValidationPipe } from '@nestjs/common';
// console.log(process.env.MYSQL_HOST);
// console.log(process.env.MYSQL_USER);


// console.log(process.env.MYSQL_DATABASE);
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  await app.listen(process.env.PORT);
  console.log(`Application is running on: ${await app.getUrl()}`);
  
}
bootstrap();
 