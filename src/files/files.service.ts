import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './entities/file.entity';
import * as AWS from 'aws-sdk';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
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

  constructor(
    @InjectRepository(File)
    private filesRepository: Repository<File>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
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
  public async uploadFile(fileName: string, file: Buffer, uploadFileDto: UploadFileDto) {
    const program = await this.programRepository.findOne({
      where: { id: uploadFileDto.programId },
    });
    if (!program) throw new Error('Programa não encontrado');

    const company = await this.companyRepository.findOne({
      where: { id: program.companyId },
    });
    if (!company) throw new Error('Empresa não encontrada');

    const cnpj = company.cnpj.replace(/[.\-\/]/g, '');
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const key = `${cnpj}/${program.name}/${uploadFileDto.folderTree}/${fileName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file,
      }),
    );

    await this.filesRepository.save({
      name: fileName,
      file_type_id: uploadFileDto.fileTypeId,
      program_id: uploadFileDto.programId,
      user_id: uploadFileDto.userId,
      file_logo_id: 1,
      url: `${key}`,
    });

    return { message: 'Arquivo enviado com sucesso', program };
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
      await this.s3.putObject(params).promise();
    }
  }

  // Criação de múltiplas pastas com subpastas para cada programa
  async createFolders(body: any) {
    const company = await this.companyRepository.findOneBy({ id: body.companyId });
    const programs = await this.programRepository.find({ where: { companyId: company.id } });

    for (const program of programs) {
      const cnpj = company.cnpj.replace(/[.\-\/]/g, '');
      const ldb = `${cnpj}/${program.name}`;
      const folders = ['CONTÁBIL', 'ENTREGÁVEL', 'TÉCNICO'];

      for (const folder of folders) {
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
      const data = await this.s3Client.send(new ListObjectsV2Command(params));

      if (!data || !data.Contents) {
        // Retorna um array vazio se não houver conteúdo (nenhum arquivo)
        return [];
      }

      // Filtrar somente os arquivos que estão na raiz da pasta, sem subpastas
      const files = data.Contents.filter((item) => !item.Key.endsWith('/')).map(async (item) => {
        const key = item.Key;
        const fileEntity = await this.filesRepository.findOne({ where: { url: key } });

        return {
          id: fileEntity ? fileEntity.id : null,
          name: key ? key.split('/').pop() : null,
          url: `https://${params.Bucket}.s3.amazonaws.com/${key}`, // URL completa do arquivo no S3
        };
      });

      // Resolve as promessas e retorna os arquivos
      return await Promise.all(files);
    } catch (err) {
      console.error('Erro ao listar os arquivos:', err);
      // Retorna um array vazio em caso de erro
      return [];
    }
  }

  // Deletar arquivos de uma pasta no S3 e banco de dados
  async delete(id: number) {
    const file = await this.filesRepository.findOne({ where: { id } });
    if (!file) throw new Error('Arquivo não encontrado');

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: file.url,
    };

    try {
      await this.s3.deleteObject(params).promise();
      await this.filesRepository.delete(file.id);
      console.log(`Arquivo deletado com sucesso: ${file.url}`);
      return file;
    } catch (error) {
      console.error('Erro ao deletar arquivo do S3:', error);
      throw new Error(`Erro ao deletar arquivo do S3: ${error.message}`);
    }
  }
}
