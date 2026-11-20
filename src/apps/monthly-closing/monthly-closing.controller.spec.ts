import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyClosingController } from './monthly-closing.controller';
import { MonthlyClosingService } from './monthly-closing.service';

describe('MonthlyClosingController', () => {
  let controller: MonthlyClosingController;

  const mockMonthlyClosingService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOneById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonthlyClosingController],
      providers: [
        {
          provide: MonthlyClosingService,
          useValue: mockMonthlyClosingService,
        },
      ],
    }).compile();

    controller = module.get<MonthlyClosingController>(MonthlyClosingController);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create', async () => {
    const user = { id: 'user-id' };
    const dto = { closingDate: '2025-01-31', taxPercentage: 6 };

    await controller.create(user, dto);

    expect(mockMonthlyClosingService.create).toHaveBeenCalledTimes(1);
    expect(mockMonthlyClosingService.create).toHaveBeenCalledWith(
      'user-id',
      dto,
    );
  });

  it('findAll', async () => {
    const user = { id: 'user-id' };
    const dto = {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      page: 1,
      limit: 10,
    };

    await controller.findAll(user, dto);

    expect(mockMonthlyClosingService.findAll).toHaveBeenCalledTimes(1);
    expect(mockMonthlyClosingService.findAll).toHaveBeenCalledWith(
      'user-id',
      dto,
    );
  });

  it('findById', async () => {
    const user = { id: 'user-id' };
    const closingId = 'closing-id';

    await controller.findById(user, closingId);

    expect(mockMonthlyClosingService.findOneById).toHaveBeenCalledTimes(1);
    expect(mockMonthlyClosingService.findOneById).toHaveBeenCalledWith(
      'user-id',
      closingId,
    );
  });

  it('update', async () => {
    const closingId = 'closing-id';
    const user = { id: 'user-id' };
    const dto = { closingDate: '2025-02-28', isClosing: true };

    await controller.update(closingId, user, dto);

    expect(mockMonthlyClosingService.update).toHaveBeenCalledTimes(1);
    expect(mockMonthlyClosingService.update).toHaveBeenCalledWith(
      closingId,
      'user-id',
      dto,
    );
  });

  it('delete', async () => {
    const closingId = 'closing-id';
    const user = { id: 'user-id' };

    await controller.delete(closingId, user);

    expect(mockMonthlyClosingService.delete).toHaveBeenCalledTimes(1);
    expect(mockMonthlyClosingService.delete).toHaveBeenCalledWith(
      closingId,
      'user-id',
    );
  });

  it('findById repassa o retorno do service', async () => {
    // 1) Arrange: crio o objeto que o service falso vai "devolver".
    //    O 1500 é inventado por mim — não veio de regra de negócio nenhuma.
    const closing = {
      id: 'closing-id',
      closingDate: '2025-01-31',
      amountCollected: 1500,
    };

    // 2) Programo o jest.fn(): quando findOneById for chamado, devolve uma Promise com closing.
    //    Equivale a mockImplementation(async () => closing).
    //    Atenção: é findOneById, não findById — é o nome real do método no service.
    mockMonthlyClosingService.findOneById.mockResolvedValue(closing);

    // 3) Act: chamo o controller com await (o service é assíncrono) e guardo o retorno.
    const result = await controller.findById({ id: 'user-id' }, 'closing-id');

    // 4) Assert 1: o controller entregou exatamente o objeto que recebeu do service.
    //    Se alguém mudar o controller para transformar o retorno, isso quebra.
    expect(result).toEqual(closing);

    // 5) Assert 2: ele chamou o service certo, com userId e id na ordem certa.
    expect(mockMonthlyClosingService.findOneById).toHaveBeenCalledWith(
      'user-id',
      'closing-id',
    );
  });
});
