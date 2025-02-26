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
import { FileType } from './entities/file-type.entity';
import { FilesInterceptor } from '@nestjs/platform-express';
import { S3Client } from '@aws-sdk/client-s3';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileNotEmptyValidator } from 'src/validators/file-not-empty.validator';
import { Program } from './entities/program.entity';

@Controller('file')
export class FilesController {
  private s3Client: S3Client;

  constructor(private readonly filesService: FilesService) {
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
    @UploadedFiles(new FileNotEmptyValidator())
    files: Array<Express.Multer.File>,
    @Body() uploadFileDto: UploadFileDto,
  ) {
    if (!files || files.length === 0) {
      console.log('Nenhum arquivo foi enviado.'); // Depurador 2: Verifica se há arquivos
      throw new HttpException(
        'Nenhum arquivo foi enviado',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Faz o upload de cada arquivo e coleta os resultados
    const results = await Promise.allSettled(
      files.map((file) =>
        this.filesService
          .uploadFile(file.originalname, file.buffer, uploadFileDto)
          .then((result) => {
            return result;
          })
          .catch((error) => {
            throw error;
          }),
      ),
    );

    // Filtra os arquivos que foram enviados com sucesso
    const fulfilledResults = results
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

    if (fulfilledResults.length === 0) {
      throw new HttpException(
        'Erro ao enviar arquivos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      message: 'Arquivos enviados com sucesso',
      files: fulfilledResults, // Retorna a lista de arquivos na estrutura esperada
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
