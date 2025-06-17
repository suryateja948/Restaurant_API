import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as mongoose from 'mongoose';
import { PassportModule } from '@nestjs/passport'; 
import { User, UserRoles } from '../schemas/user.schema';
import { Category, Restaurant } from './schemas/restaurant.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { Query } from 'express-serve-static-core';

type ExpressQuery = Query; //you're creating an alias type named 'ExpressQuery' so you can use it more easily or customize it later if needed.

//type ExpressQuery = any; // if i use it to any then in mock query i need to change it to number instead of string -> const mockQuery: ExpressQuery = { page: 1 }

describe('RestaurantsController', () => {
  let controller: RestaurantsController;
  let service: RestaurantsService;
// 👇 Creating a mock user object for testing with 'user' role
const mockUser: User = {
  // A mock ObjectId used to simulate a real MongoDB _id
  _id: new mongoose.Types.ObjectId('6836f8917432d565600ee76e'),

  // Dummy name for the mock user
  name: 'dummy User',

  // Dummy email address for the mock user
  email: 'dummy@gmail.com',

  // Assigning the role of 'USER' to simulate a regular user
  role: UserRoles.USER,

  // Casting it to unknown first, then to User type
  // This bypasses TypeScript strict typing since this is a plain object,
  // not a real instance of a Mongoose model.
} as unknown as User;

// 👇 Creating a mock admin object for testing with 'admin' role
const mockAdmin: User = {
  // Another mock ObjectId to simulate admin's _id
  _id: new mongoose.Types.ObjectId('6836f8917432d565600ee77f'),

  // Dummy name for the admin
  name: 'Admin',

  // Dummy email for the admin (can be same or different)
  email: 'dummy@gmail.com',

  // Assigning the 'ADMIN' role
  role: UserRoles.ADMIN,

  // Same casting trick as above to match the expected User type
} as unknown as User;


  const mockUserOwnedRestaurant: Restaurant = {
    _id: new mongoose.Types.ObjectId('683875237b7c6f42fd1d0277'),
    name: 'User Owned Cafe',
    description: 'A cafe owned by a user.',
    email: 'cafe@test.com',
    phoneNo: 1234567890,
    address: '123 User St',
    category: Category.CAFE,
    user: mockUser,
    updatedBy: mockUser,
    images: [],
    meals: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Restaurant;

  const mockFineDiningRestaurant: Restaurant = {
    _id: new mongoose.Types.ObjectId('683875237b7c6f42fd1d0288'),
    name: 'Posh Place',
    description: 'A fine dining restaurant.',
    email: 'finedine@test.com',
    phoneNo: 9876543210,
    address: '456 Admin Ave',
    category: Category.FINE_DINING,
    user: mockUser,
    updatedBy: mockAdmin,
    images: [],
    meals: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Restaurant;

 const mockQuery: ExpressQuery = { page: '1' }; // Declares a mock query object with a 'page' key, typed as Express-compatible query params for safe testing or mocking request queries (value is considered as string).


  const mockRestaurantsService = {
    findAll: jest.fn(),
    findFineDiningOrOwned: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  }; // Creates a mock version of the RestaurantsService with all its methods replaced by Jest mock functions to simulate behavior in unit tests without calling real service logic.

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [RestaurantsController],
      providers: [
        {
          provide: RestaurantsService,
          useValue: mockRestaurantsService,
        },
      ],
    }).compile();

    controller = module.get<RestaurantsController>(RestaurantsController);
    service = module.get<RestaurantsService>(RestaurantsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ===== Tests for getAllRestaurants =====
  describe('getAllRestaurants', () => {
    it('should call findAll for an ADMIN user', async () => {
      const mockReq = { user: mockAdmin };
      mockRestaurantsService.findAll.mockResolvedValue([mockUserOwnedRestaurant]);
      const result = await controller.getAllRestaurants(mockQuery, mockReq);
      expect(service.findAll).toHaveBeenCalledWith(mockQuery);
      expect(service.findFineDiningOrOwned).not.toHaveBeenCalled();
      expect(result).toEqual([mockUserOwnedRestaurant]);
    });

    it('should call findFineDiningOrOwned for a USER', async () => {
      const mockReq = { user: mockUser };
      mockRestaurantsService.findFineDiningOrOwned.mockResolvedValue([
        mockUserOwnedRestaurant,
        mockFineDiningRestaurant,
      ]);
      const result = await controller.getAllRestaurants(mockQuery, mockReq);
      expect(service.findFineDiningOrOwned).toHaveBeenCalledWith(mockQuery, mockUser._id);
      expect(service.findAll).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should throw UnauthorizedException for an invalid role', async () => {
      const mockReq = { user: { ...mockUser, role: 'GUEST' } };
      await expect(controller.getAllRestaurants(mockQuery, mockReq)).rejects.toThrow(
        new UnauthorizedException('Invalid role'),
      );
    });
  });

  // ===== Tests for createRestaurant =====
  describe('createRestaurant', () => {
    it('should create a new restaurant', async () => {
      const mockReq = { user: mockUser };
      const createDto: CreateRestaurantDto = {
        name: 'New Eatery',
        description: 'A brand new place',
        email: 'new@eatery.com',
        phoneNo: 1112223333,
        address: '1 New Way',
        category: Category.CAFE,
      };
      const createdRestaurant = { ...createDto, _id: new mongoose.Types.ObjectId() } as unknown as Restaurant;
      mockRestaurantsService.create.mockResolvedValue(createdRestaurant);

      const result = await controller.createRestaurant(createDto, mockReq);
      expect(service.create).toHaveBeenCalledWith(createDto, mockUser);
      expect(result.name).toBe(createDto.name);
    });
  });

  // ===== Tests for getRestaurant =====
  describe('getRestaurant', () => {
    it('should get a restaurant by its ID', async () => {
      mockRestaurantsService.findById.mockResolvedValue(mockFineDiningRestaurant);
      const result = await controller.getRestaurant(mockFineDiningRestaurant._id.toHexString());
      //const result = await controller.getRestaurant(mockFineDiningRestaurant._id.toString());
      expect(service.findById).toHaveBeenCalledWith(mockFineDiningRestaurant._id.toHexString());
      expect(result).toEqual(mockFineDiningRestaurant);
    });
  });

  // ===== Tests for updateRestaurant =====
  describe('updateRestaurant', () => {
    const updateDto: UpdateRestaurantDto = {
        name: 'Updated Name',
        category: Category.FAST_FOOD
    };

    it('should allow ADMIN to update any restaurant', async () => {
      const mockReq = { user: mockAdmin };
      mockRestaurantsService.findById.mockResolvedValue(mockUserOwnedRestaurant);
      mockRestaurantsService.updateById.mockResolvedValue({ ...mockUserOwnedRestaurant, ...updateDto } as unknown as Restaurant);
      const result = await controller.updateRestaurant(mockUserOwnedRestaurant._id.toHexString(), updateDto, mockReq);
      expect(service.findById).toHaveBeenCalledWith(mockUserOwnedRestaurant._id.toHexString());
      expect(service.updateById).toHaveBeenCalledWith(mockUserOwnedRestaurant._id.toHexString(), updateDto, mockAdmin._id);
      expect(result.name).toBe('Updated Name');
    });

    it('should allow USER to update a restaurant they own', async () => {
      const mockReq = { user: mockUser };
      mockRestaurantsService.findById.mockResolvedValue(mockUserOwnedRestaurant);
      mockRestaurantsService.updateById.mockResolvedValue({ ...mockUserOwnedRestaurant, ...updateDto } as unknown as Restaurant);
      await controller.updateRestaurant(mockUserOwnedRestaurant._id.toHexString(), updateDto, mockReq);
      expect(service.updateById).toHaveBeenCalled();
    });

    it('should allow USER to update a Fine Dining restaurant they DO NOT own', async () => {
        const mockReq = { user: mockUser };
        mockRestaurantsService.findById.mockResolvedValue(mockFineDiningRestaurant);
        mockRestaurantsService.updateById.mockResolvedValue({ ...mockFineDiningRestaurant, ...updateDto } as unknown as Restaurant);
        await controller.updateRestaurant(mockFineDiningRestaurant._id.toHexString(), updateDto, mockReq);
        expect(service.updateById).toHaveBeenCalled();
    });

    it('should THROW UnauthorizedException when a USER tries to update a non-owned, non-Fine Dining restaurant', async () => {
      const mockReq = { user: mockUser };
      const otherRestaurant = { ...mockFineDiningRestaurant, category: Category.CAFE, user: mockAdmin } as unknown as Restaurant;
      mockRestaurantsService.findById.mockResolvedValue(otherRestaurant);
      await expect(controller.updateRestaurant(otherRestaurant._id.toHexString(), updateDto, mockReq)).rejects.toThrow(
        new UnauthorizedException('You can only update Fine Dining restaurants or restaurants that you own.'),
      );
      expect(service.updateById).not.toHaveBeenCalled();
    });

    it('should THROW NotFoundException if restaurant to update is not found', async () => {
      const mockReq = { user: mockUser };
      mockRestaurantsService.findById.mockResolvedValue(null);
      await expect(controller.updateRestaurant('nonexistentid', updateDto, mockReq)).rejects.toThrow(
        new NotFoundException('Restaurant with ID "nonexistentid" not found.'),
      );
    });
  });

  // ===== Tests for deleteRestaurant =====
  describe('deleteRestaurant', () => {
    it('should return { deleted: true } on successful deletion', async () => {
      const mockReq = { user: mockUser };
      mockRestaurantsService.deleteById.mockResolvedValue(mockUserOwnedRestaurant);
      const result = await controller.deleteRestaurant(mockUserOwnedRestaurant._id.toHexString(), mockReq);
      expect(service.deleteById).toHaveBeenCalledWith(mockUserOwnedRestaurant._id.toHexString());
      expect(result).toEqual({ deleted: true, message: 'Restaurant deleted successfully' });
    });

    it('should return { deleted: false } if restaurant was not found or already deleted', async () => {
      const mockReq = { user: mockUser };
      mockRestaurantsService.deleteById.mockResolvedValue(null);
      const result = await controller.deleteRestaurant('nonexistentid', mockReq);
      expect(service.deleteById).toHaveBeenCalledWith('nonexistentid');
      expect(result).toEqual({ deleted: false, message: 'Already deleted or does not exist' });
    });
  });
});