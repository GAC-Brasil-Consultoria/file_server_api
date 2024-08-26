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
import { FileType } from './entities/file-type.entity';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// import { Company } from './entities/company.entity';
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
    @InjectRepository(FileType)
    private filesTypeRepository: Repository<FileType>,
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
      region: process.env.AWS_REGION, // Exemplo: 'us-east-1'
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  public async uploadFile(
    fileName: string,
    file: Buffer,
    programId,
    userId,
    file_type_id,
  ) {
    const program = await this.programRepository.findOne({
      where: {
        id: programId,
      },
    });
    const company = await this.companyRepository.findOne({
      where: {
        id: program.companyId,
      },
    });
    const fileType = await this.filesTypeRepository.findOne({
      where: {
        id: file_type_id,
      },
    });
    console.log(fileType.path);
    const cnpj = company.cnpj.replace(/[.\-\/]/g, '');
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const key = `${cnpj}/${program.name}${fileType.path}${fileName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file,
      }),
    );

    await this.filesRepository.save({
      file_type_id: file_type_id,
      program_id: programId,
      url: `${key.split('/').map(encodeURIComponent).join('/')}`,
      user_id: userId,
      file_logo_id: 1,
    });

    return [];
  }
  async createFolder(ldb: string, folderName: string = null) {
    if (folderName === 'CONTÁBIL') {
      const subFolders = [
        'Controles internos',
        'Notas Fiscais',
        'RH',
        'Timesheet',
        'Valoração',
      ];

      for (const subFolder of subFolders) {
        const params = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: `${ldb}/CONTÁBIL/${subFolder}/`, // Note the trailing slash to create a folder
          Body: '',
        };
        await this.s3.putObject(params).promise();
      }
    } else if (folderName === 'TÉCNICO') {
      const subFolders = [
        'Anexo FORMP&D',
        'Arquivado',
        'Documentação Técnica',
        'Imagens',
      ];

      for (const subFolder of subFolders) {
        const params = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: `${ldb}/TÉCNICO/${subFolder}/`, // Note the trailing slash to create a folder
          Body: '',
        };
        await this.s3.putObject(params).promise();
      }
    } else {
      const subFolders = [
        'Dossiê',
        'FORMP&D',
        'Parecer MCTI',
        'Relatório Gerencial',
      ];

      for (const subFolder of subFolders) {
        const params = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: `${ldb}/ENTREGÁVEL/${subFolder}/`, // Note the trailing slash to create a folder
          Body: '',
        };
        await this.s3.putObject(params).promise();
      }
    }
  }

  async createFolderByCompany(companyId: number) {
    const company = await this.companyRepository.findOneBy({
      id: companyId,
    });

    const programs = await this.programRepository.findBy({
      companyId: company.id,
    });
    programs.forEach(async (program) => {
      await this.createFolders(program.id);
    });
    return company.name;
  }

  async createFolderByProgram(programId: number) {
    const program = await this.programRepository.findOneBy({
      id: programId,
    });
    await this.createFolders(program.id);

    return program.name;
  }
  async createFolders(programId: number) {
    const program = await this.programRepository.findOneBy({
      id: programId,
    });
    const company = await this.companyRepository.findOneBy({
      id: program.companyId,
    });

    const programName = program.name;
    const cnpj = company.cnpj.replace(/[.\-\/]/g, '');
    const ldb = `${cnpj}/${programName}`;
    await this.createFolder(ldb);
    await this.createFolder(ldb, 'CONTÁBIL');
    await this.createFolder(ldb, 'TÉCNICO');
    await this.createFolder(ldb, 'ENTREGÁVEL');
  }

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
      const files = await this.listFiles(prefix);

      return {
        name: match[1],
        subfolders: subfolderNodes,
        files: files,
      };
    };

    return await fetchSubfolders(
      folderName.endsWith('/') ? folderName : `${folderName}/`,
    );
  }

  async listFiles(folder) {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Prefix: folder,
    };

    try {
      const data = await this.s3.listObjectsV2(params).promise();
      console.log(data);

      const files = data.Contents.map((item) => item.Key)
        .filter((key) => !key.endsWith('/')) // Filtra apenas os arquivos
        .filter((key) => {
          if (key.startsWith(folder)) {
            const remainingPath = key.slice(folder.length);
            return !remainingPath.includes('/');
          }
          return false;
        })
        .map(async (key) => {
          const match = key.match(/\/([^\/]+)\/?$/);

          const file = await this.filesRepository.findOne({
            where: {
              url: key.split('/').map(encodeURIComponent).join('/'),
            },
          });
          if (file) {
            return {
              name: match[1],
              id: file.id,
            };
          }
          // return match ? match[1] : null;
        })
        .filter(Boolean); // Remove valores nulos
      return files;
    } catch (err) {
      console.error('Erro ao listar os arquivos:', err);
      throw err;
    }
  }

  async delete(ids: any) {
    for (const id of ids) {
      const file = await this.filesRepository.findOne({
        where: {
          id: id,
        },
      });


      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      let fileUrl = decodeURIComponent(file.url); // Decodificação
      fileUrl = fileUrl.replace(/\+/g, ' ');

      const params = {
        Bucket: bucketName,
        Key: fileUrl,
      };
      try {
        await this.s3.headObject(params).promise();
        await this.s3.deleteObject(params).promise();

        await this.filesRepository.delete(file.id);
      } catch (error) {
        if (error.code === 'NotFound') {
          throw new Error(`Arquivo nao encontrado : ${error.message}`);
        } else {
          throw new Error(`Failed to delete file from S3: ${error.message}`);
        }
      }
    }
  }
}
