import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  
  @Get()
  getHello() {

    return {
      message: 'Erro ao enviar o ASDASDS',
      data: this.appService.getHello(), 
      
    };
  }
}
