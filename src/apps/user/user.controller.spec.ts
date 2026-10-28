import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { beforeEach } from 'node:test';

describe('UserController', () => {
  let userController: UserController;

  const mockUserService = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    requestEmailChange: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    userController = module.get<UserController>(UserController);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(userController).toBeDefined();
  });

  it('create', async () => {
    const dto = {
      name: 'Name test',
      cnpj: '70074043000105',
      email: 'test@test.com',
      password: 'Test123!',
    };

    await userController.create(dto);

    expect(mockUserService.create).toHaveBeenCalledTimes(1);
    expect(mockUserService.create).toHaveBeenCalledWith(dto);
  });

  it('update', async () => {
    const userId = '040f0e7a-b175-4c9d-b338-f0d3eed3dcdf';
    const dto = {
      name: 'Name updated',
      cnpj: '77119191000130',
      taxPercentage: 6,
    };

    await userController.update({ id: userId }, dto);

    expect(mockUserService.update).toHaveBeenCalledTimes(1);
    expect(mockUserService.update).toHaveBeenCalledWith(userId, dto);
  });

  it('fidByMe', async () => {
    const userId = '040f0e7a-b175-4c9d-b338-f0d3eed3dcdf';

    await userController.findByMe({ id: userId });

    expect(mockUserService.findById).toHaveBeenCalledTimes(1);
    expect(mockUserService.findById).toHaveBeenCalledWith(userId);
  });

  it('requestEmailChange', async () => {
    const userId = '040f0e7a-b175-4c9d-b338-f0d3eed3dcdf';
    const dto = {
      email: 'test@test.com',
    };

    await userController.requestEmailChange({ id: userId }, dto);

    expect(mockUserService.requestEmailChange).toHaveBeenCalledTimes(1);
    expect(mockUserService.requestEmailChange).toHaveBeenCalledWith(
      userId,
      dto.email,
    );
  });

  it('changePassword', async () => {
    const userId = '040f0e7a-b175-4c9d-b338-f0d3eed3dcdf';
    const dto = {
      currentPassword: 'Test123!',
      newPassword: 'Test1234!',
    };

    await userController.changePassword({ id: userId }, dto);

    expect(mockUserService.changePassword).toHaveBeenCalledTimes(1);
    expect(mockUserService.changePassword).toHaveBeenCalledWith(userId, dto);
  });
});
