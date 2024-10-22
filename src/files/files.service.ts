import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './entities/file.entity';
import { Folder } from './entities/folder.entity';
import { FileType } from './entities/file-type.entity';

import * as AWS from 'aws-sdk';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,  // Certifique-se de importar este comando
} from '@aws-sdk/client-s3';
import { Company } from './entities/company.entity';
import { Program } from './entities/program.entity';
import { UploadFileDto } from './dto/upload-file.dto';

export interface FolderNode {
  name: string;
  subfolders: FolderNode[];
  files: any;
}

@Injectable()
export class FilesService {
  private s3: AWS.S3;
  private s3Client: S3Client;
  private readonly logger = new Logger(FilesService.name); // Usando logger NestJS

  constructor(
    @InjectRepository(File)
    private filesRepository: Repository<File>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
    @InjectRepository(FileType)
    private readonly fileTypeRepository: Repository<FileType>,
  ) {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  // Upload de arquivos para o S3
  public async uploadFile(
    fileName: string,
    file: Buffer,
    uploadFileDto: UploadFileDto,
  ): Promise<{ name: string; url: string; s3Key: string }> {
    this.logger.log(`Iniciando o upload do arquivo: ${fileName}`); // Log inicial

    // 1. Buscar informações do programa e da empresa
    const program = await this.programRepository.findOne({
      where: { id: uploadFileDto.programId },
    });
    if (!program) {
      // this.logger.error('Programa não encontrado'); // Log de erro
      throw new Error('Programa não encontrado');
    }

    const company = await this.companyRepository.findOne({
      where: { id: program.companyId },
    });
    if (!company) {
      // this.logger.error('Empresa não encontrada'); // Log de erro
      throw new Error('Empresa não encontrada');
    }

    // 2. Gerar o caminho da chave S3 (s3Key)
    const cnpj = company.cnpj.replace(/[.\-\/]/g, ''); // Remove caracteres especiais do CNPJ
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const s3Key = `${cnpj}/${program.name}/${uploadFileDto.folderTree}/${fileName}`; // Chave S3

    // this.logger.log(`Gerando chave S3: ${s3Key}`); // Log da chave gerada

    // 3. Fazer o upload do arquivo para o S3
    try {
      // this.logger.log(`Fazendo upload para o bucket: ${bucketName}`); // Log do upload
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
          Body: file,
        }),
      );
      // this.logger.log(`Upload para S3 concluído: ${s3Key}`); // Log após sucesso no upload
    } catch (error) {
      // this.logger.error(`Erro ao fazer upload para S3: ${error.message}`); // Log de erro
      throw new Error(`Erro ao fazer upload para S3: ${error.message}`);
    }

    // 4. Gerar a URL pública do arquivo no S3
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    // this.logger.log(`URL gerada: ${fileUrl}`); // Log da URL gerada

    // 5. Salvar informações no banco de dados, incluindo a chave S3 e a URL
    const newFile = this.filesRepository.create({
      name: fileName,
      s3Key: s3Key,  // Chave S3 salva no banco
      url: fileUrl,  // URL pública
      file_type_id: uploadFileDto.fileTypeId,
      program_id: uploadFileDto.programId,
      user_id: uploadFileDto.userId,
      file_logo_id: 1,  // Ajuste conforme necessário
    });

    try {
      // this.logger.log(`Salvando informações do arquivo no banco de dados: ${fileName}`); // Log antes de salvar
      await this.filesRepository.save(newFile);
      // this.logger.log(`Arquivo salvo no banco de dados: ${fileName}`); // Log após sucesso no salvamento
    } catch (error) {
      // this.logger.error(`Erro ao salvar arquivo no banco de dados: ${error.message}`); // Log de erro
      throw new Error(`Erro ao salvar arquivo no banco de dados: ${error.message}`);
    }

    // 6. Retornar as informações do arquivo na estrutura desejada
    return { name: fileName, url: fileUrl, s3Key: s3Key };
  }

  // Criação de pastas específicas com subpastas
  async createFolder(ldb: string, folderName: string = null) {
    const folderMap = {
      'CONTÁBIL': ['Controles internos', 'Notas Fiscais', 'RH', 'Timesheet', 'Valoração'],
      'TÉCNICO': ['Anexo FORMP&D', 'Arquivado', 'Documentação Técnica', 'Imagens'],
      'ENTREGÁVEL': ['Dossiê', 'FORMP&D', 'Parecer MCTI', 'Relatório Gerencial'],
    };

    const subFolders = folderMap[folderName] || [];

    for (const subFolder of subFolders) {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `${ldb}/${folderName}/${subFolder}/`, // Trailing slash para criar a pasta
        Body: '',
      };

      // Log para verificar os parâmetros antes de fazer a chamada ao S3
      console.log(`Criando pasta: ${params.Key} no bucket: ${params.Bucket}`);

      try {
        const result = await this.s3.putObject(params).promise();

        // Log para verificar a resposta da operação de criação no S3
        console.log(`Pasta criada com sucesso: ${params.Key}`, result);
      } catch (error) {
        // Log para verificar se houve algum erro ao tentar criar a pasta no S3
        console.error(`Erro ao criar pasta: ${params.Key}`, error);
        throw new HttpException(
          `Erro ao criar pasta no S3: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  // Criação de múltiplas pastas com subpastas para cada programa
  async createFolders(body: any) {
    let company: Company;
    let programs: Program[] = [];

    // Verificar se foi passado o companyId ou programId
    if (body.companyId) {
      // Buscar a empresa pelo companyId
      company = await this.companyRepository.findOneBy({ id: body.companyId });
      if (!company) {
        console.error(`Empresa com ID ${body.companyId} não encontrada.`);
        throw new HttpException('Empresa não encontrada', HttpStatus.NOT_FOUND);
      }

      // Buscar todos os programas associados à empresa
      programs = await this.programRepository.find({ where: { companyId: company.id } });
      if (!programs.length) {
        console.error(`Nenhum programa encontrado para a empresa ${company.id}.`);
        throw new HttpException('Nenhum programa encontrado para a empresa', HttpStatus.NOT_FOUND);
      }

      console.log(`Criando pastas para todos os programas da empresa ${company.name}.`);
    } else if (body.programId) {
      // Buscar o programa específico pelo programId
      const program = await this.programRepository.findOneBy({ id: body.programId });
      if (!program) {
        console.error(`Programa com ID ${body.programId} não encontrado.`);
        throw new HttpException('Programa não encontrado', HttpStatus.NOT_FOUND);
      }

      // Buscar a empresa associada ao programa
      company = await this.companyRepository.findOneBy({ id: program.companyId });
      if (!company) {
        console.error(`Empresa associada ao programa não encontrada.`);
        throw new HttpException('Empresa associada ao programa não encontrada', HttpStatus.NOT_FOUND);
      }

      // Buscar todos os programas associados à empresa do programa fornecido
      programs = await this.programRepository.find({ where: { companyId: company.id } });
      if (!programs.length) {
        console.error(`Nenhum programa encontrado para a empresa ${company.id}.`);
        throw new HttpException('Nenhum programa encontrado para a empresa', HttpStatus.NOT_FOUND);
      }

      console.log(`Criando pastas para todos os programas da empresa ${company.name} (a partir do programId ${body.programId}).`);
    } else {
      // Caso nenhum dos parâmetros tenha sido passado
      console.error('Nem companyId nem programId foram fornecidos.');
      throw new HttpException('É necessário fornecer um companyId ou um programId.', HttpStatus.BAD_REQUEST);
    }

    // Criar as pastas para cada programa da empresa (caso tenha sido passado o companyId ou programId)
    for (const program of programs) {
      const cnpj = company.cnpj.replace(/[.\-\/]/g, ''); // Remove pontuação do CNPJ
      const sanitizedProgramName = String(program.name).replace(/\//g, ''); // Garante que program.name seja string e remove qualquer barra '/'
      const ldb = `${cnpj}/${sanitizedProgramName}`; // Concatena CNPJ e nome do programa
      const folders = ['CONTÁBIL', 'ENTREGÁVEL', 'TÉCNICO'];
    
      for (const folder of folders) {
        console.log(`Criando pasta: ${folder} para o programa: ${sanitizedProgramName}`);
        await this.createFolder(ldb, folder);
      }
    }
    
    return programs;
  }

  // Listar todas as pastas e subpastas com seus arquivos
  async listAllFolders(programId: number) {
    const program = await this.programRepository.findOneBy({
      id: programId,
    });

    const company = await this.companyRepository.findOneBy({
      id: program.companyId,
    });

    const cnpj = company.cnpj.replace(/[.\-\/]/g, '');

    const folderPath = `${cnpj}/${program.name}`;
    const folders = await this.getAllSubfolders(folderPath);
    return folders.subfolders;
  }

  // Obter todas as subpastas e arquivos de um diretório no S3
  async getAllSubfolders(folderName: string): Promise<FolderNode> {
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;

    const fetchSubfolders = async (prefix: string): Promise<FolderNode> => {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: '/',
      });

      const response = await this.s3Client.send(command);
      const subfolders =
        response.CommonPrefixes?.map((prefix) => prefix.Prefix) ?? [];
      const subfolderNodes = await Promise.all(subfolders.map(fetchSubfolders));

      const regex = /\/([^\/]+)\/?$/;
      const match = prefix.match(regex);
      const files = await this.listFiles(prefix); // Lista os arquivos com ID e URL

      return {
        name: match ? match[1] : 'root', // Nome da pasta
        subfolders: subfolderNodes,
        files: files, // Lista os arquivos com ID e URL
      };
    };

    // Garante que sempre seja retornado um folderNode, mesmo se a pasta não tiver subpastas
    return await fetchSubfolders(
      folderName.endsWith('/') ? folderName : `${folderName}/`,
    );
  }

  // Listar arquivos de uma subpasta
  async listFiles(folder: string) {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Prefix: folder,
      Delimiter: '/',
    };

    try {
      const data = await this.s3.listObjectsV2(params).promise();

      if (!data || !data.Contents) {
        console.log('Nenhum arquivo encontrado para o prefixo:', folder);
        return [];
      }

      // Para cada arquivo, busque no banco de dados e adicione a chave S3 no retorno
      const files = await Promise.all(
        data.Contents
          .filter((item) => !item.Key.endsWith('/'))  // Exclui pastas (chaves que terminam com '/')
          .map(async (item) => {
            const key = item.Key;
            const url = `https://${params.Bucket}.s3.amazonaws.com/${key}`;

            // Busca o arquivo no banco de dados usando a s3Key (chave S3)
            const fileEntity = await this.filesRepository.findOne({
              where: { s3Key: key },  // A busca está sendo feita usando a chave S3 salva no banco
            });

            return {
              id: fileEntity ? fileEntity.id : null,  // Se o arquivo for encontrado, retorna o ID, caso contrário, null
              name: key ? key.split('/').pop() : null,  // Nome do arquivo
              url: url,  // URL completa do arquivo
              s3Key: key,  // Chave S3 do arquivo
            };
          })
      );

      return files;
    } catch (err) {
      console.error('Erro ao listar os arquivos do S3:', err);
      throw err;
    }
  }

  // Deletar arquivos de uma pasta no S3 e banco de dados
  async deleteByS3Key(s3Key: string): Promise<any> {
    let fileDeletedFromDB = false;
    let fileDeletedFromS3 = false;
    let messages = [];

    // Buscar o arquivo no banco de dados
    const file = await this.filesRepository.findOne({ where: { s3Key } });

    if (file) {
      // Tentar deletar o arquivo do banco de dados
      try {
        await this.filesRepository.remove(file);
        fileDeletedFromDB = true;
      } catch (error) {
        messages.push(`Erro ao deletar arquivo do banco de dados: ${error.message}`);
      }
    } else {
      messages.push(`Arquivo não encontrado no banco de dados para a chave S3: ${s3Key}`);
    }

    // Tentar deletar o arquivo do S3
    try {
      const deleteParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME, // Usar o nome do bucket a partir da variável de ambiente
        Key: s3Key,
      };
      await this.s3Client.send(new DeleteObjectCommand(deleteParams));
      fileDeletedFromS3 = true;
    } catch (error) {
      messages.push(`Erro ao deletar arquivo do S3: ${error.message}`);
    }

    // Montar a resposta final
    if (fileDeletedFromDB && fileDeletedFromS3) {
      return { message: `Arquivo deletado com sucesso do S3 e banco de dados: ${s3Key}` };
    } else if (fileDeletedFromDB) {
      return { message: `Arquivo deletado do banco de dados, mas não foi encontrado no S3: ${s3Key}`, details: messages };
    } else if (fileDeletedFromS3) {
      return { message: `Arquivo deletado do S3, mas não foi encontrado no banco de dados: ${s3Key}`, details: messages };
    } else {
      throw new HttpException(`Erro ao deletar arquivo. Detalhes: ${messages.join('. ')}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Função para buscar os tipos de arquivos para uma pasta com base no nome da pasta
  async getFileTypesByFolderName(folderName: string): Promise<FileType[]> {
    // Buscar a pasta pelo nome
    const folder = await this.folderRepository.findOne({
      where: { name: folderName },
      relations: ['fileTypes'],  // Carrega os tipos de arquivos relacionados
    });

    if (!folder) {
      throw new Error(`Folder with name '${folderName}' not found`);
    }

    // Retorna os tipos de arquivos relacionados à pasta
    return folder.fileTypes;
  }
}
