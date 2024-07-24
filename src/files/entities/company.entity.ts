import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('empresas')
export class Company {
  @PrimaryGeneratedColumn({ name: 'id_empresa' })
  id: number;

  @Column({ name: 'nome_empresa' })
  name: string;

  @Column({ name: 'cnpj_empresa' })
  cnpj: string;

  @UpdateDateColumn({
    name: 'atualizado_em',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  public updated_at: Date;
}
