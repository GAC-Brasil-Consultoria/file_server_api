import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity("colaboradores")
export class Colaborador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'empresa_id', type: 'int' })
  empresaId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'empresa_id' })
  empresa: Company;
}