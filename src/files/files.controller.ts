import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { FilesService } from './files.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log(file.originalname);
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const result = await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: `61186680000174/LDB_2021_BANCO_BMG_S.A/CONTÁBIL/Notas Fiscais/${file.originalname}`,
        Body: file.buffer,
      }),
    );
    console.log(result);
    
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
}
