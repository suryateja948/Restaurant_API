import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { getModelToken } from '@nestjs/mongoose';
//import { User } from 'src/schemas/user.schema';
import {User} from '../schemas/user.schema'
import { UnauthorizedException } from '@nestjs/common';
import { Model } from 'mongoose';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userModel: Model<User>;
  let JWT_SECRET: string;

  const mockUser = {
    _id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
  };

  const mockUserModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    // Set the env var before each test
    JWT_SECRET = 'test_jwt_secret';
    process.env.JWT_SECRET = JWT_SECRET;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userModel = module.get<Model<User>>(getModelToken(User.name));

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up env var to avoid side effects
    delete process.env.JWT_SECRET;
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return the user when found by ID', async () => {
    mockUserModel.findById.mockResolvedValue(mockUser);

    const payload = { sub: mockUser._id };
    const result = await strategy.validate(payload);

    expect(mockUserModel.findById).toHaveBeenCalledWith(payload.sub);
    expect(result).toEqual(mockUser);
  });

  it('should throw UnauthorizedException if user is not found', async () => {
    mockUserModel.findById.mockResolvedValue(null);

    const payload = { sub: 'nonexistentUserId' };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate(payload)).rejects.toThrow(
      'Login first to access this resource'
    );
  });
});
