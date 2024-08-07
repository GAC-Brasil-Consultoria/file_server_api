import { IsNotEmpty } from 'class-validator';


export class UploadFileDto {

    @IsNotEmpty()
    programId: number;

    @IsNotEmpty()
    userId: number;
    
    @IsNotEmpty()
    fileTypeId: number;
}
