import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { FilesService } from './files.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { S3Client } from '@aws-sdk/client-s3';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileNotEmptyValidator } from 'src/validators/file-not-empty.validator';
import { DataSource } from 'typeorm';
import { Program } from './entities/program.entity';

//Necessario refatorar os parametros de alguns métodos do controller para o padrao DTO
//e nao usar o request.body para facilitar a validação da requisição
//Também é necessário refatorar o service para receber o DTO
@Controller('file')
export class FilesController {
  private s3Client: S3Client;

  constructor(
    private filesService: FilesService,
    private readonly dataSource: DataSource,
  ) {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION, // Exemplo: 'us-east-1'
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFiles(
    @UploadedFiles(new FileNotEmptyValidator()) files: Express.Multer.File[],
    @Body() uploadFileDto: UploadFileDto,
  ) {
    const results = await Promise.allSettled(
      files.map((file) =>
        this.filesService.uploadFile(file.originalname, file.buffer, uploadFileDto),
      ),
    );
    
    const targetProgram = results[0] as PromiseFulfilledResult<Program>;

    return {
      message: 'Arquivos enviados com sucesso',
      log: [ `Arquivos enviados para o programa: ${targetProgram.value.name} <br> - ${files.map((f) => f.originalname).join('<br>- ')}`],
    };
  }

  @Post('create-folders')
  @HttpCode(201)
  async createFolder(@Req() request: Request) {
    // return request.body
    /* console.log(request.body);
    const connection = this.dataSource.options;
    console.log({ connection }) */

    const programs = await this.filesService.createFolders(request.body);
    return {
      message: 'Pastas criadas com sucesso!!!',
      data: [],
      log: [
        `Cirou diretórios padrões para os programas: <br>- ${programs.map((p) => p.name).join('<br>- ')}`,
      ],
    };
  }
  @Get('foldersAndFilesByProgram/:id')
  async foldersAndFilesByProgram(@Param() params: any) {
    return {
      message: 'Pastas e arquivos carregados com sucesso',
      data: await this.filesService.listAllFolders(params.id),
    };
  }
  @Delete(':id')
  async deleteFile(@Param() params: any) {
    console.log(params);
    const result = await this.filesService.delete(params.id)
    return {
      message: 'Arquivo deletado com sucesso',
      data: result,
      log: [`Deletou arquivo ${result.name}`],
    };
  }
}
