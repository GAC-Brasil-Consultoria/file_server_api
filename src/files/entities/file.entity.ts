import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity("arquivos")
export class File {
  @PrimaryGeneratedColumn({ name: 'id_arquivo' })
  id: number;

  @Column({ name: 'nome_arquivo', type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ name: 'extensao_arquivo', type: 'varchar', length: 255, nullable: true })
  extension: string;

  @Column({ name: 'url', type: 'varchar', length: 255, nullable: true })
  url: string;

  @Column({ name: 's3Key', type: 'varchar', length: 255, nullable: true })
  s3Key: string;

  @Column({ name: 'observacao_arquivo', type: 'text', nullable: true })
  observation: string;

  @Column({ name: 'programa_id' })
  program_id: number;

  @Column({ name: 'arquivo_tipo_id' })
  file_type_id: number;

  @Column({ name: 'arquivo_logo_id' })
  file_logo_id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamp' })
  created_at: Date;
}
