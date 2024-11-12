import { ApiProperty } from "@nestjs/swagger";
import { GroupDto } from "./group.dto";

export class UserDto {
    @ApiProperty()
    id: number;
  
    @ApiProperty()
    name: string;
  
    @ApiProperty()
    email: string;
  
    @ApiProperty()
    isActive: boolean;
  
    @ApiProperty({ type: [GroupDto] })
    groups: GroupDto[];
  }