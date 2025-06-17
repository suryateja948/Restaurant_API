import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { User, UserRoles } from '../schemas/user.schema';
import { Model } from 'mongoose';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './dto/login.dto';

jest.mock('bcryptjs');

describe('AuthService - Login', () => {
    let authService: AuthService;
    let userModel: Model<User>;
    let jwtService: JwtService;

    const mockUser = {
        _id: 'some-id-123',
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword123',
        role: UserRoles.USER,
    };

    const mockUserModel = {
        findOne: jest.fn(),
        create: jest.fn(),
        find: jest.fn(),
    };

    const mockJwtService = {
        signAsync: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: getModelToken(User.name), useValue: mockUserModel },
                { provide: JwtService, useValue: mockJwtService },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        userModel = module.get<Model<User>>(getModelToken(User.name));
        jwtService = module.get<JwtService>(JwtService);
        jest.clearAllMocks();
    });

     it('should be defined', () => {
      expect(authService).toBeDefined();
    });

    // 1️⃣ Valid login
    it('1. should return token and user data on successful login', async () => {
        const loginDto = plainToInstance(LoginDto, {
            email: '   Test@Example.COM ',
            password: '  password123 ',
        });

        const expectedToken = 'mock.jwt.token';
        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.signAsync.mockResolvedValue(expectedToken);

        const result = await authService.login(loginDto);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
        expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
        expect(jwtService.signAsync).toHaveBeenCalledWith({
            email: mockUser.email,
            sub: mockUser._id,
            role: mockUser.role,
        });
        expect(result.token).toEqual(expectedToken);
        expect(result.user).toMatchObject({
            name: mockUser.name,
            email: mockUser.email,
            role: mockUser.role,
        });
    });

    // 2️⃣ Invalid password
    it('2. should throw UnauthorizedException for incorrect password', async () => {
        const loginDto = plainToInstance(LoginDto, {
            email: 'test@example.com',
            password: 'wrongpassword',
        });

        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    // 3️⃣ Invalid email (user not found)
    it('3. should throw UnauthorizedException if user does not exist', async () => {
        const loginDto = plainToInstance(LoginDto, {
            email: 'nouser@example.com',
            password: 'password123',
        });

        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(null),
        });

        await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });




    // 4️⃣ Case-insensitive email
    it('4. should login successfully with uppercase email', async () => {
        const loginDto = plainToInstance(LoginDto, {
            email: 'TEST@EXAMPLE.COM',
            password: 'password123',
        });

        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.signAsync.mockResolvedValue('token');

        const result = await authService.login(loginDto);
        expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
        expect(result.user.email).toEqual('test@example.com');
    });

    // 5️⃣ Email trimmed
 // ✅ TEST CASE: Verifies that email input is trimmed before being used to search in DB
it('5. should trim whitespaces in email before checking DB', async () => {

    //  Arrange: Create a LoginDto instance with extra spaces in the email
    const loginDto = plainToInstance(LoginDto, {
        email: '   test@example.com   ',      // Intentionally added spaces to test trimming
        password: 'password123',             // A valid password
    });

    //  Mock the DB query: Simulate what happens when userModel.findOne() is called
    // It returns an object with a select() function, which resolves to a mock user
    mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),   // mockUser is a valid user object with email & password
    });

    //  Mock bcrypt password comparison to always return true (passwords match)
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    //  Mock JWT token signing to return a fake token
    mockJwtService.signAsync.mockResolvedValue('token');

    //  Act: Call the login method (with email having spaces)
    // Even though we assign it to _result, we don't use it – only testing the side effect
    const result = await authService.login(loginDto);

    // ✅ Assert: Make sure the email passed to findOne was trimmed (no spaces)
    expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(result.user.email).toEqual('test@example.com');
});


    // 6️⃣ Password trimmed
    it('6. should trim whitespaces in password before validation', async () => {
        const loginDto = plainToInstance(LoginDto, {
            email: 'test@example.com',
            password: '   password123   ',
        });

        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.signAsync.mockResolvedValue('token');

        await authService.login(loginDto);
        expect(bcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password);
    });

    // 7️⃣ Password is 8+ chars but incorrect
    it('7. should throw UnauthorizedException for 8+ char incorrect password', async () => {
        const loginDto = plainToInstance(LoginDto, {
            email: 'test@example.com',
            password: 'abcdefgh',
        });

        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    // 8️⃣ Email exists, but password doesn't match
    it('8. should return 401 if email exists but password is invalid', async () => {
        const loginDto = plainToInstance(LoginDto, {
            email: 'test@example.com',
            password: 'wrongpass123',
        });

        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    // 9️⃣ Ensure password is excluded from login response
    it('9. should not return password in final user object', async () => {
        const loginDto = plainToInstance(LoginDto, {
            email: 'test@example.com',
            password: 'password123',
        });

        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.signAsync.mockResolvedValue('token');

        const result = await authService.login(loginDto);
        expect(result.user).not.toHaveProperty('password');
    });

    // 🔟 JWT token is signed with expected payload
    it('10. should generate JWT with correct payload', async () => {
        const loginDto = plainToInstance(LoginDto, {
            email: 'test@example.com',
            password: 'password123',
        });

        mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockJwtService.signAsync.mockResolvedValue('token');

        await authService.login(loginDto);
        expect(jwtService.signAsync).toHaveBeenCalledWith({
            email: mockUser.email,
            sub: mockUser._id,
            role: mockUser.role,
        });
    });
});
