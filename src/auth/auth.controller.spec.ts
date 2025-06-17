import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Controller, UnauthorizedException } from '@nestjs/common';
import { UserRoles } from '../schemas/user.schema';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    signUp: jest.fn(),
    login: jest.fn(),
    getAllUsers: jest.fn(),
  };
   it('should be defined', () => {
      expect(Controller).toBeDefined();
    });

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    authController = moduleRef.get<AuthController>(AuthController);
    authService = moduleRef.get<AuthService>(AuthService);
  });

  describe('signUp', () => {
    it('should call authService.signUp and return the created user', async () => {
      const signUpDto: SignUpDto = {
        name: 'Surya',
        email: 'surya@example.com',
        password: 'password123',
        role: UserRoles.USER,
      };

      const createdUser = { ...signUpDto, _id: 'mockId' };
      mockAuthService.signUp.mockResolvedValue(createdUser);

      const result = await authController.signUp(signUpDto);
      expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpDto);
      expect(result).toEqual(createdUser);
    });
  });

  describe('login', () => {
    it('should call authService.login and return a token and user info', async () => {
      const loginDto: LoginDto = {
        email: 'surya@example.com',
        password: 'password123',
      };

      const loginResponse = {
        message: 'Login successful',
        token: 'mockToken',
        user: {
          name: 'Surya',
          email: 'surya@example.com',
          role: 'User',
        },
      };

      mockAuthService.login.mockResolvedValue(loginResponse);

      const result = await authController.login(loginDto);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(loginResponse);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(authController.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users from authService.getAllUsers()', async () => {
      const mockUsers = [
        { name: 'User1', email: 'user1@example.com', role: 'User' },
        { name: 'Admin', email: 'admin@example.com', role: 'Admin' },
      ];

      mockAuthService.getAllUsers.mockResolvedValue(mockUsers);

      const result = await authController.getAllUsers();
      expect(mockAuthService.getAllUsers).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });
});
