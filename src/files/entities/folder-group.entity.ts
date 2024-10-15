import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    OneToMany,
} from 'typeorm';
import { Folder } from './folder.entity'; // Entidade Folder

@Entity('pastas_grupos')
export class FolderGroup {
    @PrimaryGeneratedColumn({ name: 'id_pasta_grupo', type: 'int' })
    id: number;

    @Column({ name: 'nome_pasta_grupo', type: 'varchar', length: 100 })
    name: string;

    @Column({ name: 'descricao_pasta_grupo', type: 'mediumtext', nullable: true })
    description: string;

    @Column({ name: 'icone_pasta_grupo', type: 'varchar', length: 100, nullable: true })
    icon: string;

    @Column({ name: 'ordem_visualizacao', type: 'int', nullable: true, default: 0 })
    displayOrder: number;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
    deletedAt: Date;

    @OneToMany(() => Folder, (folder) => folder.folderGroup)
    folders: Folder[];
}
