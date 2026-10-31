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

  it('cadastra um usuário e envia o e-mail de confirmação', async () => {
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

  it('confirma o e-mail do usuário', async () => {
    const userId = 'user-id';

    await service.confirmEmail(userId);

    expect(userRepoMock.update).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        emailVerifiedAt: expect.any(Date) as Date,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationSentAt: null,
      }),
    );
  });

  it('não cadastra um usuário quando o e-mail já existe', async () => {
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
});
