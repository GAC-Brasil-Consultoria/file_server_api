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

  public async uploadFile(fileName: string, file: Buffer, uploadFileDto: UploadFileDto) {
    const program = await this.programRepository.findOne({
      where: {
        id: uploadFileDto.programId,
      },
    });

    const company = await this.companyRepository.findOne({
      where: {
        id: program.companyId,
      },
    });

    const cnpj = company.cnpj.replace(/[.\-\/]/g, '');
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const key = `${cnpj}/${program.name}/CONTÁBIL/Notas Fiscais/${fileName}`;

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
    return program;
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
  async createFolders(body: any) {
    
    const company = await this.companyRepository.findOneBy({
      id: body.companyId,
    });
    const programs = await this.programRepository.find({
      where: {
        companyId: company.id,
      },
    });
    

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

  async listAllFolders(programId: number) {
    const program = await this.programRepository.findOneBy({
      id: programId,
    });

    const company = await this.companyRepository.findOneBy({
      id: program.companyId,
    });

    const cnpj = company.cnpj.replace(/[.\-\/]/g, '');

    const folderPath = `${cnpj}/${program.name}`;
    // const folderPath = 'ACESSO DIGITAL TECNOLOGIA DA INFORMACAO S.A.';
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
      
      const files = data.Contents.map((item) => item.Key)
        .filter((key) => !key.endsWith('/')) // Filtra apenas os arquivos
        .map((key) => {
          const match = key.match(/\/([^\/]+)\/?$/);
          return match ? match[1] : null;
        })
        .filter(Boolean); // Remove valores nulos

      return files;
    } catch (err) {
      console.error('Erro ao listar os arquivos:', err);
      throw err;
    }
  }

  // async checkIfObjectExists(bucket, key) {
  //   try {
  //     await this.s3.headObject({ Bucket: bucket, Key: key }).promise();
  //     console.log('Object exists');
  //     return true;
  //   } catch (error) {
  //     if (error.code === 'NotFound') {
  //       return false;
  //     }
  //     // Handle other errors, e.g., permission issues
  //     throw error;
  //   }
  // }
  async delete(id: number) {
    const file = await this.filesRepository.findOne({
      where: {
        id: id,
      },
    });
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    // const regex = /^https:\/\//i;

    const params = {
      Bucket: bucketName,
      Key: file.url,
    };

    try {
      await this.s3.deleteObject(params).promise();
      console.log(`File deleted successfully from `);
      return;
    } catch (error) {
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }
}
