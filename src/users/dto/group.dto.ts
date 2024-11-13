import { ApiProperty } from '@nestjs/swagger';
import { PermissionDto } from './permission.dto';

export class GroupDto {
  id: number;

  name: string;

  description?: string;

  @ApiProperty({ type: [PermissionDto] })
  permissions: PermissionDto[];
}
