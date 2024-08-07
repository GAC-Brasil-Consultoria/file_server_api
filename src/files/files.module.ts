import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { File } from './entities/file.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { Program } from './entities/program.entity';
import { FileType } from './entities/file-type.entity';
// import { Company } from './entities/company.entity';

@Module({
  providers: [FilesService],
  controllers: [FilesController],
  imports: [TypeOrmModule.forFeature([File, Company, Program, FileType])],
  exports: [FilesService, TypeOrmModule],
})
export class FilesModule {}
