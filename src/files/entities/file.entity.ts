import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity("arquivos")
export class File {
  @PrimaryGeneratedColumn({name:'id_arquivo'})
  id: number;

  @Column()
  url: string;

  @Column({ name: 'programa_id' })
  program_id: number;

  @Column({ name: 'tipo_arquivo_id' })
  file_type_id: number;

  
  @Column({ name: 'user_id' })
  user_id: number;


}
