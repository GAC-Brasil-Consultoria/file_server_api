import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities.ts/user.entity';
import { HttpModule } from '@nestjs/axios';
import { folderPermissionsMapping } from './utils/folderPermissionsMapping';

@Module({
  imports: [TypeOrmModule.forFeature([User]), HttpModule],
  providers: [
    UsersService,
    {
      provide: 'FOLDER_PERMISSIONS_MAPPING',
      useValue: folderPermissionsMapping,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
