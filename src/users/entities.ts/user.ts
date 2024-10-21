import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('usuarios')
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, name: 'id_usuario' })
  id: number;

  @Column({ type: 'varchar', length: 128, collation: 'utf8mb3_general_ci', name: 'nome_usuario' })
  name: string;

  @Column({ type: 'varchar', length: 240, collation: 'utf8mb3_general_ci', name: 'email_usuario' })
  email: string;

  @Column({ type: 'varchar', length: 240, collation: 'utf8mb3_general_ci', name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 80, nullable: true, default: null, collation: 'utf8mb3_general_ci', name: 'reset_hash' })
  resetHash?: string;

  @Column({ type: 'datetime', nullable: true, default: null, name: 'reset_expira_em' })
  resetExpiresAt?: Date;

  @Column({ type: 'varchar', length: 240, nullable: true, default: null, collation: 'utf8mb3_general_ci', name: 'imagem_usuario' })
  profileImage?: string;

  @Column({ type: 'tinyint', width: 1, name: 'ativo_usuario' })
  isActive: boolean;

  @CreateDateColumn({ type: 'datetime', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'criado_em' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'datetime', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'atualizado_em' })
  updatedAt?: Date;

  @DeleteDateColumn({ type: 'datetime', nullable: true, default: null, name: 'deletado_em' })
  deletedAt?: Date;
}
