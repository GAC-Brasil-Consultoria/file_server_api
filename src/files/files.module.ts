import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { File } from './entities/file.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { Program } from './entities/program.entity';
import { Folder } from './entities/folder.entity';  // Certifique-se de que a entidade Folder está importada corretamente
import { FileType } from './entities/file-type.entity';  // Certifique-se de que a entidade FileType está importada corretamente
import { FolderGroup } from './entities/folder-group.entity';  // Certifique-se de que a entidade FolderGroup está importada corretamente

@Module({
  imports: [
    TypeOrmModule.forFeature([File, Company, Program, Folder, FileType, FolderGroup]),  // Certifique-se de que Folder está registrada aqui
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
