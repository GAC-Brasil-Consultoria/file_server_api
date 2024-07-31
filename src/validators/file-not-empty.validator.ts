// src/validators/file-not-empty.validator.ts

import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { Express } from 'express';

@Injectable()
export class FileNotEmptyValidator implements PipeTransform {
  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('É necessario enviar o arquivo.');
    }
    if (file.size === 0) {
      throw new BadRequestException('File cannot be empty.');
    }
    return file;
  }
}
