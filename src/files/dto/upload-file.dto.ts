import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  programId: number;
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  userId: number;
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  fileTypeId: number;
}
