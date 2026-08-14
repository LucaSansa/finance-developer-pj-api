import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(data: CreateUserDto) {
    const existingUser = await this.findByEmail(data.email);

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const existingCnpj = await this.findByCnpj(data.cnpj);

    if (existingCnpj) {
      throw new ConflictException('Cnpj já cadastrado');
    }

    data.password = bcrypt.hashSync(data.password, 10);
    const user = this.userRepo.create(data);

    const userReturn = {
      name: user.name,
      cnpj: user.cnpj,
      email: user.email,
    };

    await this.userRepo.save(user);

    return userReturn;
  }

  findAll() {
    return this.userRepo.find();
  }

  findById(id: string) {
    return this.userRepo.findOne({
      where: {
        id,
      },
    });
  }

  findByEmail(email: string) {
    return this.userRepo.findOne({
      where: {
        email,
      },
      select: ['id', 'name', 'cnpj', 'email', 'password'],
    });
  }

  findByCnpj(cnpj: string) {
    return this.userRepo.findOne({
      where: {
        cnpj: cnpj,
      },
      select: ['name', 'cnpj', 'email'],
    });
  }

  async saveRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    await this.userRepo.update(userId, { refreshTokenHash: hash });
  }

  async findByIdWithRefreshHash(userId: string) {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id: userId })
      .getOne();
  }

  async clearRefreshTokenHash(userId: string) {
    await this.userRepo.update(userId, { refreshTokenHash: null });
  }
}
