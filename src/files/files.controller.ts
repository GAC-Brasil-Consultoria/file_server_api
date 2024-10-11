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

  // Deletar arquivo por s3Key
  @Delete()
  async deleteFile(@Body('s3Key') s3Key: string) {
    if (!s3Key) {
      throw new HttpException('Chave S3 (s3Key) é obrigatória', HttpStatus.BAD_REQUEST);
    }

    try {
      // Chama a função de deleção no serviço
      const result = await this.filesService.deleteByS3Key(s3Key);

      // Retorna a mensagem apropriada
      return {
        message: result.message,
        details: result.details || [],
        log: [`Tentativa de deletar arquivo com S3 Key: ${s3Key}`],
      };
    } catch (error) {
      // Log do erro
      console.error(`Erro ao deletar arquivo com S3 Key ${s3Key}:`, error);

      // Lança uma exceção genérica para o frontend
      throw new HttpException(
        `Erro ao deletar arquivo com S3 Key ${s3Key}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
