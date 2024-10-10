import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  HttpException,
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
import { Program } from './entities/program.entity';

@Controller('file')
export class FilesController {
  private s3Client: S3Client;

  constructor(
    private readonly filesService: FilesService,
  ) {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION, // Exemplo: 'us-east-1'
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  // Upload de arquivos para o AWS S3 com validação via DTO
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFiles(
    @UploadedFiles(new FileNotEmptyValidator()) files: Express.Multer.File[],
    @Body() uploadFileDto: UploadFileDto,
  ) {
    // Faz o upload de cada arquivo e aguarda a conclusão
    const results = await Promise.allSettled(
      files.map((file) =>
        this.filesService.uploadFile(file.originalname, file.buffer, uploadFileDto),
      ),
    );

    // Verifica se houve sucesso em algum dos uploads
    const fulfilledResult = results.find(result => result.status === 'fulfilled') as PromiseFulfilledResult<{ message: string; program: Program }>;

    if (!fulfilledResult) {
      throw new HttpException('Erro ao enviar arquivos', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const targetProgram = fulfilledResult.value.program;

    return {
      message: 'Arquivos enviados com sucesso',
      log: [
        `Arquivos enviados para o programa: ${targetProgram.name} <br> - ${files
          .map((f) => f.originalname)
          .join('<br>- ')}`,
      ],
    };
  }

  // Criação de pastas com base no DTO
  @Post('create-folders')
  @HttpCode(201)
  async createFolder(@Body() body: any) {
    const programs = await this.filesService.createFolders(body);
    return {
      message: 'Pastas criadas com sucesso!',
      data: [],
      log: [
        `Criou diretórios padrões para os programas: <br>- ${programs
          .map((p) => p.name)
          .join('<br>- ')}`,
      ],
    };
  }

  // Lista todas as pastas e arquivos por programa
  @Get('foldersAndFilesByProgram/:id')
  async foldersAndFilesByProgram(@Param('id') id: number) {
    try {
      const data = await this.filesService.listAllFolders(id);
      return {
        message: 'Pastas e arquivos carregados com sucesso',
        data,
      };
    } catch (error) {
      console.error(
        `Erro ao carregar pastas e arquivos para o programa ${id}:`,
        error,
      );
      throw new HttpException(
        'Erro ao carregar pastas e arquivos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Deletar arquivo por ID
  @Delete(':id')
  async deleteFile(@Param('id') id: number) {
    try {
      const result = await this.filesService.delete(id);
      return {
        message: 'Arquivo deletado com sucesso',
        data: result,
        log: [`Deletou arquivo ${result.name}`],
      };
    } catch (error) {
      console.error(`Erro ao deletar arquivo com ID ${id}:`, error);
      throw new HttpException(
        'Erro ao deletar arquivo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
