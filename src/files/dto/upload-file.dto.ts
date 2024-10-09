import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UploadFileDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  programId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  fileTypeId: number;

  @IsNotEmpty()
  @IsString()
  folderTree: string;
}
