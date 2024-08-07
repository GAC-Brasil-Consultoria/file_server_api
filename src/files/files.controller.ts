import {
  Body,
  Controller,
  Delete,
  Get,
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
  @UseInterceptors(FilesInterceptor('files')) // 'files' is the name of the field in the form
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
    
    // console.log(files);
    
    return {
      message: 'Arquivos enviador com sucesso',
      data: files,
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


    const data = await this.filesService.listAllFolders(params.id);
    const resolvedData = await Promise.all(data.map(async (folder: any) => {
      if (folder.subfolders) {
          folder.subfolders = await Promise.all(folder.subfolders.map(async (subfolder: any) => {
              if (subfolder.files) {
                  subfolder.files = await Promise.all(subfolder.files.map(async (filePromise: any) => {
                      return await filePromise;
                  }));
              }
              return subfolder;
          }));
      }
      return folder;
  }));    
    return {
      message: 'Pastas e arquivos carregados com sucesso',
      data: resolvedData,
    };
  }
  @Delete('') 
  async deleteFile(@Param() params: any , @Body() body) { 
    return {
      message: 'Pastas e arquivos carregados com sucesso',
      data: await this.filesService.delete(body.ids),
    };
  }
} 
