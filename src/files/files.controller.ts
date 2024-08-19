import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { S3Client } from '@aws-sdk/client-s3';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileNotEmptyValidator } from 'src/validators/file-not-empty.validator';
import { ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateFolderDto } from './dto/create-folder-dto';

@Controller('file')
export class FilesController {
  private s3Client: S3Client;

  constructor(private filesService: FilesService) {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION, // Exemplo: 'us-east-1'
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Faz upload de múltiplos arquivos.' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Arquivos enviados com sucesso.',
    schema: {
      example: {
        message: 'Arquivos enviados com sucesso',
        data: [
          {
            originalname: 'nome_do_arquivo.extensão',
            buffer: '<Buffer de Dados do Arquivo>',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Requisição inválida ou arquivos vazios.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Os arquivos enviados estão vazios',
        error: 'Bad Request',
      },
    },
  })
  async uploadFiles(
    @UploadedFiles(new FileNotEmptyValidator()) files: Express.Multer.File[],
    @Body() uploadFileDto: UploadFileDto,
  ) {
    for (const file of files) {
      await this.filesService.uploadFile(
        file.originalname,
        file.buffer,
        uploadFileDto.programId,
        uploadFileDto.userId,
        uploadFileDto.fileTypeId,
      );
    }

    return {
      message: 'Arquivos enviador com sucesso',
      data: files,
    };
  }
  @Post('create-folders')
  async createFolder(@Body() body: CreateFolderDto) {
    console.log('entrou');
    
    const companyName = await this.filesService.createFolderByCompany(
      body.companyId,
    );
    return {
      message: 'Pastas criadas com sucesso',
      log:["Diretorios Criados na empresa: "+companyName]
    };
  }
  @Post('create-folders-program')
  async createFolderByProgram(@Body() body) {
    console.log('entrou');
    
    const programName = await this.filesService.createFolderByCompany(
      body.programId,
    ); 
    return {
      message: 'Pastas criadas com sucesso',
      log:["Diretorios Criados na empresa: "+programName]
    };
  }S
  @Get('foldersAndFilesByProgram/:id')
  async foldersAndFilesByProgram(@Param() params: any) { 
    const data = await this.filesService.listAllFolders(params.id);
    const resolvedData = await Promise.all(
      data.map(async (folder: any) => {
        if (folder.subfolders) {
          folder.subfolders = await Promise.all(
            folder.subfolders.map(async (subfolder: any) => {
              if (subfolder.files) {
                subfolder.files = await Promise.all(
                  subfolder.files.map(async (filePromise: any) => {
                    return await filePromise;
                  }),
                );
              }
              return subfolder;
            }),
          );
        }
        return folder;
      }),
    );
    return {
      message: 'Pastas e arquivos carregados com sucesso',
      data: resolvedData,
    };
  }
  @Delete('')
  async deleteFile(@Param() params: any, @Body() body) {
    return {
      message: 'Pastas e arquivos carregados com sucesso',
      data: await this.filesService.delete(body.ids),
    };
  }
}
