import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DossierModule } from './dossier/dossier.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './files/entities/file.entity';
import { FilesModule } from './files/files.module';
import { Company } from './files/entities/company.entity';
import { Program } from './files/entities/program.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Isso torna as variáveis de ambiente globais
    }),
    DossierModule,
    FilesModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQL_HOST,
      port: 3306,
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS,
      database: process.env.MYSQL_DATABASE,
      entities: [File, Company, Program],
      synchronize: false,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
