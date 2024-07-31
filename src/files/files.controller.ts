import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Client } from '@aws-sdk/client-s3';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileNotEmptyValidator } from 'src/validators/file-not-empty.validator';

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
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(new FileNotEmptyValidator()) file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
  ) {
    await this.filesService.uploadFile(
      file.originalname,
      file.buffer,
      uploadFileDto.programId,
    );

    return {
      message: 'Pastas criadas com sucesso',
      data: [],
    };
  }
  @Post('create-folders')
  async createFolder(@Req() request: Request) {
    // return request.body
    await this.filesService.createFolders(request.body);

    return {
      message: 'Pastas criadas com sucesso',
      data: [],
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
    return {
      message: 'Pastas e arquivos carregados com sucesso',
      data: await this.filesService.delete(params.id),
    };
  }
}
