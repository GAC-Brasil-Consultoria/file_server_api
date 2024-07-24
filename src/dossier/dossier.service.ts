import { Injectable } from '@nestjs/common';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateDossierDto } from './dto/update-dossier.dto';

@Injectable()
export class DossierService {
  create(createDossierDto: CreateDossierDto) {
    return 'This action adds a new dossier';
  }

  findAll() {
    return `This action returns all dossier`;
  }

  findOne(id: number) {
    return `This action returns a #${id} dossier`;
  }

  update(id: number, updateDossierDto: UpdateDossierDto) {
    return `This action updates a #${id} dossier`;
  }

  remove(id: number) {
    return `This action removes a #${id} dossier`;
  }
}
