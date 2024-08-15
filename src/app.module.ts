import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DossierModule } from './dossier/dossier.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './files/entities/file.entity';
import { FilesService } from './files/files.service';
import { FilesModule } from './files/files.module';
import { Company } from './files/entities/company.entity';
import { Program } from './files/entities/program.entity';
import { FileLogo } from './files/entities/file-logo.entity';
import { FileType } from './files/entities/file-type.entity';
import { User } from './users/entities.ts/user';

@Module({
  imports: [
    DossierModule,
    FilesModule,

    TypeOrmModule.forRoot({
      type: 'mysql',
      host:
        process.env.MYSQLMYSQL_HOST_USER ||
        'mygac-dev.cpqh76cssuzm.us-east-1.rds.amazonaws.com',
      port: 3306,
      username: process.env.MYSQL_USER || 'developer',
      password: process.env.MYSQL_PASS || 'Mygacdb_2023_dev',
      database: process.env.MYSQL_DATABASE || 'mygac_dev',
      entities: [File, Company, Program, FileLogo, FileType, User],
      synchronize: false,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, FilesService],
})
export class AppModule {}
