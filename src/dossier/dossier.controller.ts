import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DossierService } from './dossier.service';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateDossierDto } from './dto/update-dossier.dto';

@Controller('dossier')
export class DossierController {
  constructor(private readonly dossierService: DossierService) {}

  @Post()
  create(@Body() createDossierDto: CreateDossierDto) {
    return this.dossierService.create(createDossierDto);
  }

  @Get()
  findAll() {
    return this.dossierService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dossierService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDossierDto: UpdateDossierDto) {
    return this.dossierService.update(+id, updateDossierDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dossierService.remove(+id);
  }
}
