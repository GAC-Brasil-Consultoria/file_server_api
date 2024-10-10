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
  public async uploadFile(
    fileName: string,
    file: Buffer,
    uploadFileDto: UploadFileDto,
  ) {
    // 1. Buscar informações do programa e da empresa
    const program = await this.programRepository.findOne({
      where: { id: uploadFileDto.programId },
    });
    if (!program) throw new Error('Programa não encontrado');

    const company = await this.companyRepository.findOne({
      where: { id: program.companyId },
    });
    if (!company) throw new Error('Empresa não encontrada');

    // 2. Gerar o caminho da chave S3 (s3Key)
    const cnpj = company.cnpj.replace(/[.\-\/]/g, '');
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const s3Key = `${cnpj}/${program.name}/${uploadFileDto.folderTree}/${fileName}`;

    // 3. Fazer o upload do arquivo para o S3
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: file,
      }),
    );

    // 4. Gerar a URL pública ou assinada
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

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

    await this.filesRepository.save(newFile);

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
  async delete(id: number) {
    const file = await this.filesRepository.findOne({ where: { id } });
    if (!file) throw new Error('Arquivo não encontrado');

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: file.s3Key,  // Agora utilizamos a chave S3 salva no banco para deletar
    };

    try {
      await this.s3.deleteObject(params).promise();
      await this.filesRepository.delete(file.id);
      console.log(`Arquivo deletado com sucesso: ${file.s3Key}`);
      return file;
    } catch (error) {
      console.error('Erro ao deletar arquivo do S3:', error);
      throw new Error(`Erro ao deletar arquivo do S3: ${error.message}`);
    }
  }
}
