import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileNotEmptyValidator } from 'src/validators/file-not-empty.validator';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateFolderDto } from './dto/create-folder-dto';
import { FileExtension, FileExtensionType } from 'src/utils/file-extensions';

@Controller('file')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  @ApiBody({ type: [UploadFileDto] })
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
    const log = [];
    for (const file of files) {
      const fileExtension = file.originalname
        .split('.')
        .pop()
        .toLowerCase() as FileExtensionType;
      
      if (!FileExtension[fileExtension]) {
        throw new HttpException(
          `Invalid file type: ${fileExtension}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const extensionData = FileExtension[fileExtension];

      console.log('File ID:', extensionData.id); // Accessing the ID of the file type
      const response = await this.filesService.uploadFile(
        file.originalname,
        file.buffer,
        uploadFileDto.programId,
        uploadFileDto.userId,
        uploadFileDto.fileTypeId, 
        extensionData.id
      );
      log.push(response);
    }

    return {
      message: 'Arquivos enviador com sucesso',
      data: files,
      log: log,
    };
  }
  @Post('create-folders')
  async createFolder(@Body() body: CreateFolderDto) {
    const companyName = await this.filesService.createFolderByCompany(
      body.companyId,
    );
    return {
      message: 'Diretorios Criados na empresa: ' + companyName,
      log: ['Diretorios Criados na empresa: ' + companyName],
    };
  }
  @Post('create-folders-program')
  async createFolderByProgram(@Body() body) {
    const programName = await this.filesService.createFolderByProgram(
      body.programId,
    );
    return {
      message: 'Diretorios Criados no programa: ' + programName,
      log: ['Diretorios Criados no programa: ' + programName],
    };
  }
  S;
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
    const log = await this.filesService.delete(body.ids);
    return {
      message: 'Arquivos apagados com sucesso',
      data: [],
      log: log,
    };
  }
}
