import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity("programas")
export class Program {
  @PrimaryGeneratedColumn({name: "id_programa"})
  id: number;

  @Column({ name: 'ano_base' })
  year: number;

  @Column({ name: 'nome_programa' })
  name: number;


  @Column({ name: 'empresa_id' })
  companyId: number;
}
