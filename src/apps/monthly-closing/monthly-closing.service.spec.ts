import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';

import { UserService } from '../user/user.service';
import { MonthlyClosing } from './entities/monthly-closing.entity';
import { MonthlyClosingRepository } from './repositories/monthly-closing.repository';

import { MonthlyClosingService } from './monthly-closing.service';

describe('MonthlyClosingService', () => {
  let service: MonthlyClosingService;

  //repositorio simples declarado no service
  const monthlyClosingRepoMock = { findOne: jest.fn() };

  const monthlyClosingRepositoryMock = {
    findOne: jest.fn(),
    findAllByUser: jest.fn(),
    findOneById: jest.fn(),
  };

  const userServiceMock = { findById: jest.fn() };

  const dataSourceMock = { createQueryRunner: jest.fn() };

  const queryRunnerMock = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),

    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonthlyClosingService,
        {
          provide: getRepositoryToken(MonthlyClosing),
          useValue: monthlyClosingRepoMock,
        },
        {
          provide: UserService,
          useValue: userServiceMock,
        },
        {
          provide: getDataSourceToken(),
          useValue: dataSourceMock,
        },
        {
          provide: MonthlyClosingRepository,
          useValue: monthlyClosingRepositoryMock,
        },
      ],
    }).compile();
    service = module.get(MonthlyClosingService);
  });

  beforeEach(() => {
    jest.resetAllMocks();

    dataSourceMock.createQueryRunner.mockReturnValue(queryRunnerMock);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
