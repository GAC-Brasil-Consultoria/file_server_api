import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { UserDto } from './dto/user.dto';
import { GroupDto } from './dto/group.dto';
import { PermissionDto } from './dto/permission.dto';
import { ConfigService } from '@nestjs/config';
import { folderPermissionsMapping } from './utils/folderPermissionsMapping';

@Injectable()
export class UsersService {
  private AUTH_URL = this.configService.getOrThrow<string>('AUTH_API_URL');

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject('FOLDER_PERMISSIONS_MAPPING')
    private readonly permissionsMapping: typeof folderPermissionsMapping,
  ) {}

  async getUserWithPermissions(userId: number): Promise<UserDto> {
    try {
      // Realiza a requisição usando o HttpService
      const response = await lastValueFrom(
        this.httpService.get(`${this.AUTH_URL}/users/${userId}`),
      );

      // Mapeando a resposta para os DTOs
      const userData = response.data;
      const userDto = new UserDto();
      userDto.id = userData.id;
      userDto.name = userData.name;
      userDto.email = userData.email;
      userDto.isActive = userData.isActive;

      // Mapeia os grupos do usuário, incluindo apenas os IDs dos grupos
      userDto.groups = userData.groups.map((groupData: any) => {
        const groupDto = new GroupDto();
        groupDto.id = groupData.id;
        groupDto.name = groupData.name;
        groupDto.description = groupData.description;

        // Excluímos as permissões individuais e mantemos apenas o ID do grupo
        groupDto.permissions = []; // Opcional: pode omitir se `permissions` não for necessário

        return groupDto;
      });

      return userDto;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  hasFolderPermission(
    user: UserDto,
    folderName: string,
    permissionType: 'read' | 'write',
  ): boolean {
    const folderPermissions = this.permissionsMapping[folderName];
    if (!folderPermissions) return false;

    const requiredPermissions = folderPermissions[permissionType];
    if (!requiredPermissions) return false;

    // Verifica se o usuário tem algum grupo com o ID necessário para a permissão especificada
    return user.groups.some((group) => requiredPermissions.includes(group.id));
  }

  isCustomer(user: UserDto): boolean {
    return user.groups.some((group) => group.id >= 20 && group.id < 30);
  }
}
