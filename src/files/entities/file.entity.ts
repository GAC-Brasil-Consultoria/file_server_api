import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity("arquivos")
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  url: string;

  @Column({ name: 'programa_id' })
  program_id: number;

  @Column({ name: 'tipo_arquivo_id' })
  file_type_id: number;
}
