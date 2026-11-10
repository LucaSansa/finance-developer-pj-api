import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { EmailService } from '../email/email.service';

describe('UserService', () => {
  let service: UserService;

  const userRepoMock = {
    create: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    merge: jest.fn(),
  };

  const emailServiceMock = {
    sendEmailVerification: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepoMock },
        { provide: EmailService, useValue: emailServiceMock },
      ],
    }).compile();

    service = module.get(UserService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('shoud register user and send email to confirmation', async () => {
    const newUser = {
      name: 'User Test',
      cnpj: '70074043000105',
      email: 'test@test.com',
      password: 'Senha123!',
    };

    userRepoMock.findOne.mockResolvedValue(null);
    userRepoMock.create.mockImplementation((user: User) => user);

    await expect(service.create(newUser)).resolves.toEqual({
      message:
        'Cadastro realizado. Consulte seu e-mail para confirmar a conta.',
    });

    expect(userRepoMock.save).toHaveBeenCalled();
    expect(emailServiceMock.sendEmailVerification).toHaveBeenCalledWith(
      newUser.email,
      newUser.name,
      expect.stringContaining('/confirmar-email?token='),
    );
  });

  it('shoud not register user when e-mail already exists', async () => {
    userRepoMock.findOne.mockResolvedValue({ email: 'test@test.com' });

    const newUser = {
      name: 'User Test',
      cnpj: '70074043000105',
      email: 'test@test.com',
      password: 'Senha123!',
    };

    await expect(service.create(newUser)).rejects.toThrow(
      'E-mail já cadastrado',
    );
  });

  it('shoud note register user when cnpj already exists', async () => {
    const newUser = {
      name: 'User Test',
      cnpj: '70074043000105',
      email: 'test1@test.com',
      password: 'Senha123!',
    };
    userRepoMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ cnpj: '70074043000105' });

    await expect(service.create(newUser)).rejects.toThrow('Cnpj já cadastrado');
  });

  it('should not register user with invalid cnpj', async () => {
    const newUser = {
      name: 'User Test',
      cnpj: '70074043000101',
      email: 'test1@test.com',
      password: 'Senha123!',
    };
    userRepoMock.findOne.mockResolvedValue(null);

    await expect(service.create(newUser)).rejects.toThrow('Cnpj inválido');
  });

  it('should update user', async () => {
    const userId = 'user-id';
    const existingUser = {
      id: userId,
      name: 'User Test',
      cnpj: '70074043000105',
      email: 'test@test.com',
      taxPercentage: 6,
    } as User;
    const changes = {
      name: 'Updated User',
      taxPercentage: 8,
    };
    const expectedUser = { ...existingUser, ...changes };

    userRepoMock.findOne.mockResolvedValue(existingUser);
    userRepoMock.merge.mockImplementation(
      (user: User, updates: Partial<User>) => {
        Object.assign(user, updates);
      },
    );
    userRepoMock.save.mockImplementation((user: User) => Promise.resolve(user));

    const result = await service.update(userId, changes);

    expect(userRepoMock.findOne).toHaveBeenCalledWith({
      where: { id: userId },
    });
    expect(userRepoMock.merge).toHaveBeenCalledWith(existingUser, changes);
    expect(userRepoMock.save).toHaveBeenCalledWith(existingUser);
    expect(result).toEqual(expectedUser);
  });

  it('should not update user with invalid cnpj', async () => {
    const userId = 'user-id';
    const existingUser = {
      id: userId,
      name: 'User Test',
      cnpj: '70074043000105',
      email: 'test@test.com',
      taxPercentage: 6,
    } as User;
    const changes = {
      name: 'Updated User',
      taxPercentage: 8,
      cnpj: '70074043000101',
    };

    userRepoMock.findOne.mockResolvedValue(existingUser);

    await expect(service.update(userId, changes)).rejects.toThrow(
      'Cnpj inválido',
    );

    expect(userRepoMock.findOne).toHaveBeenCalledWith({
      where: { id: userId },
    });
    expect(userRepoMock.merge).not.toHaveBeenCalled();
    expect(userRepoMock.save).not.toHaveBeenCalled();
  });

  it('shoud not update user when cnpj already exists', async () => {
    const userId = 'user-id';
    const existingUser = {
      id: userId,
      name: 'User Test',
      cnpj: '53297853000101',
      email: 'test@test.com',
      taxPercentage: 6,
    } as User;
    const changes = {
      cnpj: '70074043000105',
    };

    userRepoMock.findOne.mockResolvedValue({ cnpj: '70074043000105' });
    userRepoMock.findOne.mockResolvedValue(existingUser);

    await expect(service.update(userId, changes)).rejects.toThrow(
      'Cnpj já cadastrado',
    );

    expect(userRepoMock.findOne).toHaveBeenCalledWith({
      where: { id: userId },
    });
    expect(userRepoMock.merge).not.toHaveBeenCalled();
    expect(userRepoMock.save).not.toHaveBeenCalled();
  });
});
