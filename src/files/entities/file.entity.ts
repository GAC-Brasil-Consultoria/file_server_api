import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FileType } from './file-type.entity';
import { FileLogo } from './file-logo.entity';

@Entity('arquivos')
export class File {
  @PrimaryGeneratedColumn({name:'id_arquivo'})
  id: number;

  @Column({ type: 'varchar', length: 255,  name:'nome_arquivo'})
  name: string;

  @Column({ type: 'varchar', length: 255,  name:'extensao_arquivo'})
  extension: string;

  @Column({ type: 'varchar', length: 255, nullable: true})
  url: string;

  @Column({ type: 'text',name:'observacao_arquivo'})
  obs: string;

  @Column()
  user_id: number;

  @Column({ type: 'int', unsigned: true ,name:'programa_id'})
  program_id: number;

  @Column({ type: 'int', unsigned: true ,name:'arquivo_tipo_id'})
  file_type_id: number;

  @Column({ type: 'int', unsigned: true ,name:'arquivo_logo_id'})
  file_logo_id: number;

  @ManyToOne(() => FileType, file_type => file_type.files)
  @JoinColumn({ name: 'arquivo_tipo_id' })
  file_type: FileType;

  // @ManyToOne(() => Usuario, usuario => usuario.arquivos)
  // @JoinColumn({ name: 'user_id' })
  // usuario: Usuario;

  // @ManyToOne(() => Programa, programa => programa.arquivos)
  // @JoinColumn({ name: 'programa_id' })
  // programa: Programa;

  @ManyToOne(() => FileLogo, file_logo => file_logo.files)
  @JoinColumn({ name: 'arquivo_logo_id' })
  file_logo: FileLogo;
}
