import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Folder } from './folder.entity';  // Assumindo que você já tem a entidade Folder

@Entity('arquivos_tipos')
export class FileType {
    @PrimaryGeneratedColumn({ name: 'id_arquivo_tipo', type: 'int', unsigned: true })
    id: number;

    @ManyToOne(() => Folder, (folder) => folder.fileTypes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @JoinColumn({ name: 'pasta_id' })
    folder: Folder;

    @Column({ name: 'nome_arquivo_tipo', type: 'varchar', length: 100 })
    name: string;

    @Column({ name: 'sigla_arquivo_tipo', type: 'varchar', length: 50 })
    abbreviation: string;

    @Column({ name: 'cor_arquivo_tipo', type: 'varchar', length: 50 })
    color: string;

    @Column({ name: 'tamanho_maximo_mb', type: 'int', nullable: true, default: 5 })
    max_size_mb: number;

    @Column({ name: 'descricao_arquivo', type: 'mediumtext', nullable: true })
    description: string;

    @Column({ name: 'formato_permitido', type: 'varchar', length: 50 })
    allowed_format: string;

    @Column({ name: 'requer_validacao', type: 'tinyint', default: 0 })
    requires_validation: boolean;

    @Column({ name: 'prazo_upload_dias', type: 'int', nullable: true })
    upload_deadline_days: number;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
    deleted_at: Date;
}
