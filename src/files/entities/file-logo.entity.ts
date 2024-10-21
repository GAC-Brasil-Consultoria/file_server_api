import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { File } from './file.entity';

@Entity('arquivos_logo')
export class FileLogo {
  @PrimaryGeneratedColumn({name:"id_arquivo_logo"})
  id: number;

  @Column({name:"arquivo_logo_extensao"})
  extension: string;

  @Column({name:"arquivo_logo_caminho"})
  path: string;
}
