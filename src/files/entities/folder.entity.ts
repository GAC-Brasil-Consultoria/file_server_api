import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { FolderGroup } from './folder-group.entity';  // Assumindo que você tem uma entidade para grupos de pastas
import { FileType } from './file-type.entity'; // Entidade de tipos de arquivos

@Entity('pastas')
@Index('Index 3', ['name'], { unique: true })  // Índice único para 'nome_pasta'
export class Folder {
    @PrimaryGeneratedColumn({ name: 'id_pasta', type: 'int' })
    id: number;

    @ManyToOne(() => FolderGroup, (folderGroup) => folderGroup.folders, { nullable: true })
    @JoinColumn({ name: 'pasta_grupo_id' })
    folderGroup: FolderGroup;

    @Column({ name: 'nome_pasta', type: 'varchar', length: 100 })
    name: string;

    @Column({ name: 'descricao_pasta', type: 'mediumtext', nullable: true })
    description: string;

    @Column({ name: 'ordem_visualizacao', type: 'int', nullable: true, default: 0 })
    displayOrder: number;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
    deletedAt: Date;

    @OneToMany(() => FileType, (fileType) => fileType.folder)
    fileTypes: FileType[];
}
