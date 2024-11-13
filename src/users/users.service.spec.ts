import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { UsersService } from './users.service';
import { UserDto } from './dto/user.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { folderPermissionsMapping } from './utils/folderPermissionsMapping';

describe('UserService', () => {
  let usersService: UsersService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('http://localhost:3001'), // Mocka o getOrThrow
          },
        },
        {
          provide: 'FOLDER_PERMISSIONS_MAPPING',
          useValue: folderPermissionsMapping,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    httpService = module.get<HttpService>(HttpService);
  });


  describe('hasFolderPermission', () => {
    it('should return true if user has the required read permission for the folder', () => {
      const user = new UserDto();
      user.groups = [
        {
          id: 23,
          name: 'Consultoria Técnica',
          description: '',
          permissions: [],
        },
      ];

      const folderName = 'Documentação Técnica';
      const permissionType = 'read';

      const result = usersService.hasFolderPermission(
        user,
        folderName,
        permissionType,
      );

      expect(result).toBe(true);
    });

    it('should return false if user does not have the required write permission for the folder', () => {
      const user = new UserDto();
      user.groups = [
        {
          id: 21, // Este grupo não tem permissão de escrita para "Imagens"
          name: 'Cliente - Contabilidade',
          description: '',
          permissions: [],
        },
      ];
    
      const folderName = 'Imagens';
      const permissionType = 'write';
    
      const result = usersService.hasFolderPermission(user, folderName, permissionType);
    
      expect(result).toBe(false);
    });

    it('should return false if folder does not exist in permissions mapping', () => {
      const user = new UserDto();
      user.groups = [
        {
          id: 23,
          name: 'Consultoria Técnica',
          description: '',
          permissions: [],
        },
      ];

      const folderName = 'Nonexistent Folder';
      const permissionType = 'read';

      const result = usersService.hasFolderPermission(
        user,
        folderName,
        permissionType,
      );

      expect(result).toBe(false);
    });

    // Caso adicional 1: Verificar permissão quando o usuário tem múltiplos grupos
    it('should return true if user has the required permission through one of multiple groups', () => {
      const user = new UserDto();
      user.groups = [
        {
          id: 24,
          name: 'Grupo Sem Permissão',
          description: '',
          permissions: [],
        },
        {
          id: 23,
          name: 'Consultoria Técnica',
          description: '',
          permissions: [],
        },
      ];

      const folderName = 'Documentação Técnica';
      const permissionType = 'read';

      const result = usersService.hasFolderPermission(
        user,
        folderName,
        permissionType,
      );

      expect(result).toBe(true);
    });

    // Caso adicional 2: Verificar permissões de leitura e escrita para o mesmo grupo
    it('should return true if user has both read and write permissions for the folder', () => {
      const user = new UserDto();
      user.groups = [
        {
          id: 23,
          name: 'Consultoria Técnica',
          description: '',
          permissions: [],
        },
      ];

      const folderName = 'Documentação Técnica';

      const hasReadPermission = usersService.hasFolderPermission(
        user,
        folderName,
        'read',
      );
      const hasWritePermission = usersService.hasFolderPermission(
        user,
        folderName,
        'write',
      );

      expect(hasReadPermission).toBe(true);
      expect(hasWritePermission).toBe(true);
    });
  });
});
