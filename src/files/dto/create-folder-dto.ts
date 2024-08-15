import { IsNotEmpty } from 'class-validator';


export class CreateFolderDto {
    @IsNotEmpty({message:"userId não pode ser vazio"})
    userId: number;
    
    @IsNotEmpty({message:"companyId não pode ser vazio"})
    companyId: number;
}
