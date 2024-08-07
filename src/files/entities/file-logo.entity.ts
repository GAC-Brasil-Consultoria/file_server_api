import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { File } from './file.entity';

@Entity('arquivos_logo')
export class FileLogo {
  @PrimaryGeneratedColumn({name:"id_arquivo_logo"})
  id: number;

  @Column()
  logo: string;

  @OneToMany(() => File, file => file.file_logo)
  files: File[];
}
