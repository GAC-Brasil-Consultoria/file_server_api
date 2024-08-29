import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { File } from './file.entity';

@Entity('arquivos_tipo')
export class FileType {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true , name:"id_arquivo_tipo" })
  id: number;

  @Column({ type: 'int', default: 0 , name:"documento_tipo_id"})
  doc_type_id: number;

  @Column({ type: 'varchar', length: 100, default: '0', name:"arquivo_tipo_nome"})
  name: string;
  
  @Column({ type: 'varchar', length: 50, default: '0' , name:"arquivo_tipo_sigla" })
  abbreviation: string;

  @Column({ type: 'varchar', length: 50, default: '0' , name:"arquivo_tipo_cor" })
  color: string;

  @Column({ type: 'varchar', length: 100, default: '0' , name:"caminho" })
  path: string;

  @Column({ type: 'datetime', nullable: true , name:"" })
  created_at: Date;

  @Column({ type: 'datetime', nullable: true , name:"" })
  updated_at: Date;

  @Column({ type: 'datetime', nullable: true , name:"" })
  deleted_at: Date;

  @OneToMany(() => File, arquivo => arquivo.file_type)
  files: File[];
}
