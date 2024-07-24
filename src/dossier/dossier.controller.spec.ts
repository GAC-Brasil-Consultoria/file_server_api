import { Test, TestingModule } from '@nestjs/testing';
import { DossierController } from './dossier.controller';
import { DossierService } from './dossier.service';

describe('DossierController', () => {
  let controller: DossierController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DossierController],
      providers: [DossierService],
    }).compile();

    controller = module.get<DossierController>(DossierController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
