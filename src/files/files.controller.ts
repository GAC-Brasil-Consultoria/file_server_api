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
import { UsersService } from '../users/users.service';

@Controller('file')
export class FilesController {
  private s3Client: S3Client;

  constructor(
    private readonly filesService: FilesService,
    private readonly usersService: UsersService,
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
  @HttpCode(HttpStatus.OK) // ou 200
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFiles(
    @UploadedFiles(new FileNotEmptyValidator())
    files: Array<Express.Multer.File>,
    @Body() uploadFileDto: UploadFileDto,
  ) {
    // Validação: se nenhum arquivo foi enviado
    if (!files || files.length === 0) {
      //this.logger.error('Nenhum arquivo foi enviado.');
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Nenhum arquivo foi enviado',
          data: null,
          errors: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    
    const canUpload = await this.filesService.canUpload(uploadFileDto);
    if (!canUpload) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Você não tem permissão para escrever nesta pasta',
          data: null,
          errors: [],
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Processa os uploads de forma paralela
    const results = await Promise.allSettled(
      files.map((file) =>
        this.filesService.uploadFile(
          file.originalname,
          file.buffer,
          uploadFileDto,
        ),
      ),
    );

    // Filtra os uploads bem-sucedidos
    const successfulUploads = results
      .filter((result) => result.status === 'fulfilled')
      .map(
        (result) =>
          (
            result as PromiseFulfilledResult<{
              name: string;
              url: string;
              s3Key: string;
            }>
          ).value,
      );

    // Compila os erros dos uploads que falharam
    const failedUploads = results
      .filter((result) => result.status === 'rejected')
      .map((result) => {
        const error = (result as PromiseRejectedResult).reason;
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        return {
          message: error.message,
          status,
        };
      });

    // Define o statusCode da resposta com base no cenário:
    // Se todos os uploads falharam, retorna status de erro; se pelo menos um for bem-sucedido, retorna 200.
    const statusCode =
      successfulUploads.length === 0
        ? HttpStatus.INTERNAL_SERVER_ERROR
        : HttpStatus.OK;

    // Retorna uma resposta padronizada com os dados e os erros
    return {
      statusCode,
      message: 'Processamento concluído',
      data: {
        files: successfulUploads,
      },
      errors: failedUploads,
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
  @Post('foldersAndFilesByProgram')
  async foldersAndFilesByProgram(
    @Body('programId') programId: number,
    @Body('userId') userId: number,
  ) {
    try {
      const data = await this.filesService.listAllFolders(programId, userId);
      return {
        message: 'Pastas e arquivos carregados com sucesso',
        data,
      };
    } catch (error) {
      console.error(
        `Erro ao carregar pastas e arquivos para o programa ${programId} e usuário ${userId}:`,
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
      throw new HttpException(
        'Chave S3 (s3Key) é obrigatória',
        HttpStatus.BAD_REQUEST,
      );
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

  @Get('file-types/:folderName')
  async getFileTypesByFolder(
    @Param('folderName') folderName: string,
  ): Promise<{ id: number; name: string; description: string }[]> {
    const fileTypes =
      await this.filesService.getFileTypesByFolderName(folderName);

    // Filtra e retorna apenas id, name e description
    return fileTypes.map((fileType) => ({
      id: fileType.id,
      name: fileType.name,
      description: fileType.description,
    }));
  }
}
