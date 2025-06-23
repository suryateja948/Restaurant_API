import { Test, TestingModule } from '@nestjs/testing';
import { MealService } from './meal.service';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import mongoose from 'mongoose';
import { Category_meals, Meal } from './schemas/meal.schema';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { Category, Restaurant } from '../restaurants/schemas/restaurant.schema';
import { User, UserRoles } from '../schemas/user.schema';

// --- MOCK DATA ---
const mockUserId = new mongoose.Types.ObjectId().toHexString();
const mockAdminId = new mongoose.Types.ObjectId().toHexString();
const mockRestaurantId = new mongoose.Types.ObjectId().toHexString();
const mockMealId = new mongoose.Types.ObjectId().toHexString();

const mockUser = {
  _id: new mongoose.Types.ObjectId(mockUserId),
  role: UserRoles.USER,
};

const mockAdmin = {
  _id: new mongoose.Types.ObjectId(mockAdminId),
  role: UserRoles.ADMIN,
};

const mockRestaurant = {
  _id: new mongoose.Types.ObjectId(mockRestaurantId),
  name: 'Test Restaurant',
  category: Category.FAST_FOOD,
  user: mockUser._id, // Set the user as an ObjectId
  meals: [],
  save: jest.fn().mockResolvedValue(this),
};

const mockMeal = {
  _id: new mongoose.Types.ObjectId(mockMealId),
  name: 'Test Meal',
  description: 'A delicious test meal.',
  price: 15,
  category: Category_meals.MAIN_COURSE,
  restaurant: new mongoose.Types.ObjectId(mockRestaurantId),
  user: mockUser._id,
  save: jest.fn().mockResolvedValue(this),
  set: jest.fn().mockReturnThis(),
};

// --- MOCK HELPERS ---
const mockMongooseQuery = (resolveValue: any) => ({
  populate: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(resolveValue),
  then: jest.fn(function (callback) {
    return Promise.resolve(callback(resolveValue));
  }),
});

describe('MealService', () => {
  let service: MealService;
  let mealModel: any;
  let restaurantModel: any;

  beforeEach(async () => {
    const createMockModel = () =>
      Object.assign(jest.fn(), {
        findById: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        findByIdAndDelete: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        base: {
          isValidObjectId: jest.fn((id) => mongoose.Types.ObjectId.isValid(id)),
        },
      });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealService,
        { provide: getModelToken(Meal.name), useValue: createMockModel() },
        { provide: getModelToken(Restaurant.name), useValue: createMockModel() },
      ],
    }).compile();

    service = module.get<MealService>(MealService);
    mealModel = module.get(getModelToken(Meal.name));
    restaurantModel = module.get(getModelToken(Restaurant.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMeal', () => {
    const createMealDto: CreateMealDto = {
      name: 'New Burger',
      description: 'A great burger',
      price: 12,
      category: Category_meals.MAIN_COURSE,
      restaurant: mockRestaurantId,
    };
    const mockPopulatedRestaurant = { ...mockRestaurant, meals: [mockMeal] };

    it('should create a new meal if it does not exist', async () => {
      mealModel.findOne.mockResolvedValue(null);
      const mealInstance = { ...mockMeal, save: jest.fn().mockResolvedValue(mockMeal) };
      mealModel.mockImplementation(() => mealInstance);

      // FIX: Handle two sequential calls to restaurantModel.findById
      restaurantModel.findById
        .mockResolvedValueOnce(mockRestaurant) // For the permission check
        .mockReturnValueOnce(mockMongooseQuery(mockPopulatedRestaurant)); // For the final return

      await service.createMeal(createMealDto, mockUser._id.toHexString(), mockUser.role);

      expect(mealInstance.save).toHaveBeenCalled();
      expect(mockRestaurant.save).toHaveBeenCalled();
    });

    it('should update an existing meal if found by name and restaurant', async () => {
      const existingMeal = { ...mockMeal, save: jest.fn().mockResolvedValue(mockMeal) };
      mealModel.findOne.mockResolvedValue(existingMeal);

      // FIX: Handle two sequential calls to restaurantModel.findById
      restaurantModel.findById
        .mockResolvedValueOnce(mockRestaurant) // For permission check
        .mockReturnValueOnce(mockMongooseQuery(mockPopulatedRestaurant)); // For final return

      await service.createMeal(createMealDto, mockUser._id.toHexString(), mockUser.role);

      expect(existingMeal.save).toHaveBeenCalled();
      expect(mockRestaurant.save).not.toHaveBeenCalled();
    });

    it('should allow USER to create a meal for their own Fine Dining restaurant', async () => {
      const fineDiningRestaurant = { ...mockRestaurant, category: Category.FINE_DINING };
      mealModel.findOne.mockResolvedValue(null);
      const mealInstance = { ...mockMeal, save: jest.fn().mockResolvedValue(mockMeal) };
      mealModel.mockImplementation(() => mealInstance);

      // FIX: Handle two sequential calls
      restaurantModel.findById
        .mockResolvedValueOnce(fineDiningRestaurant) // For permission check
        .mockReturnValueOnce(mockMongooseQuery(mockPopulatedRestaurant)); // For final return

      await service.createMeal(createMealDto, mockUser._id.toHexString(), mockUser.role);

      expect(mealInstance.save).toHaveBeenCalled();
    });

    it('should allow user to create meal for a Fine Dining restaurant not owned by them', async () => {
      const otherUserFineDining = { ...mockRestaurant, category: Category.FINE_DINING, user: new mongoose.Types.ObjectId() };
      mealModel.findOne.mockResolvedValue(null);
      const mealInstance = { ...mockMeal, save: jest.fn().mockResolvedValue(mockMeal) };
      mealModel.mockImplementation(() => mealInstance);

      // FIX: Handle two sequential calls
      restaurantModel.findById
        .mockResolvedValueOnce(otherUserFineDining) // For permission check
        .mockReturnValueOnce(mockMongooseQuery(mockPopulatedRestaurant)); // For final return

      await service.createMeal(createMealDto, mockUser._id.toHexString(), mockUser.role);

      expect(mealInstance.save).toHaveBeenCalled();
    });
  });

  describe('updateMealByRestaurant', () => {
    const updateDto: UpdateMealDto = { name: 'Updated Meal Name' };

    it('should update a meal successfully for an admin', async () => {
      // Create a fresh mock meal instance for this test to track its methods
      const mealToUpdate = {
        ...mockMeal,
        restaurant: new mongoose.Types.ObjectId(mockRestaurantId),
        save: jest.fn(), // We need to check if this gets called
      };

      const updatedAndPopulatedMeal = {
        ...mealToUpdate,
        ...updateDto,
        restaurant: mockRestaurant,
        user: mockAdmin,
      };

      // Mock the database calls in the order they appear in the service
      restaurantModel.findById.mockResolvedValue(mockRestaurant);

      // The service calls findById TWICE. We need to mock both calls.
      mealModel.findById
        .mockResolvedValueOnce(mealToUpdate) // 1. The first call to get the meal object to modify.
        .mockReturnValueOnce(mockMongooseQuery(updatedAndPopulatedMeal)); // 2. The second call after .save() to get the populated result.

      const result = await service.updateMealByRestaurant(mockMealId, mockRestaurantId, updateDto, mockAdmin as User);

      // FIX: Assert that .save() was called, not .set()
      expect(mealToUpdate.save).toHaveBeenCalled();

      // Assert that the properties were correctly assigned before saving
      expect(mealToUpdate.name).toBe(
        updateDto.name ? updateDto.name.trim().toLowerCase() : undefined
      );

      // Assert the final returned value is the populated meal
      expect(result).toEqual(updatedAndPopulatedMeal);
    });

    it("should allow a User to update a meal if it's in a Fine Dining restaurant they don't own", async () => {
      const updateDto: UpdateMealDto = { price: 250 };
      const fineDiningRestaurant = {
        _id: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(), // Belongs to someone else
        category: Category.FINE_DINING,
      };

      const mealToUpdate = {
        ...mockMeal,
        restaurant: fineDiningRestaurant._id,
        save: jest.fn(),
      };

      const updatedAndPopulatedMeal = {
        ...mealToUpdate,
        ...updateDto,
        restaurant: fineDiningRestaurant,
        user: mockUser,
      };

      // Mock the database calls
      restaurantModel.findById.mockResolvedValue(fineDiningRestaurant);

      // Mock the two sequential calls to mealModel.findById
      mealModel.findById
        .mockResolvedValueOnce(mealToUpdate) // 1. Get the meal to modify
        .mockReturnValueOnce(mockMongooseQuery(updatedAndPopulatedMeal)); // 2. Get the final populated result

      await service.updateMealByRestaurant(mockMealId, fineDiningRestaurant._id.toHexString(), updateDto, mockUser as User);

      // FIX: Assert that .save() was called
      expect(mealToUpdate.save).toHaveBeenCalled();

      // Assert that properties were assigned correctly
      expect(mealToUpdate.price).toBe(updateDto.price);
    });

    // These tests for error conditions should work correctly as they exit before the save/re-fetch logic
    it('should throw BadRequestException if meal does not belong to the restaurant', async () => {
      const mealFromAnotherRestaurant = { ...mockMeal, restaurant: new mongoose.Types.ObjectId() };
      restaurantModel.findById.mockResolvedValue(mockRestaurant);
      mealModel.findById.mockResolvedValue(mealFromAnotherRestaurant);
      await expect(
        service.updateMealByRestaurant(mockMealId, mockRestaurantId, updateDto, mockAdmin as User)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if meal is not found', async () => {
      restaurantModel.findById.mockResolvedValue(mockRestaurant);
      mealModel.findById.mockResolvedValue(null); // Meal find returns null
      await expect(
        service.updateMealByRestaurant(mockMealId, mockRestaurantId, updateDto, mockAdmin as User)
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when a User tries to update a meal for another user's Non-Fine Dining restaurant", async () => {
      const otherUsersRestaurant = { ...mockRestaurant, user: new mongoose.Types.ObjectId() };
      restaurantModel.findById.mockResolvedValue(otherUsersRestaurant);
      await expect(
        service.updateMealByRestaurant(mockMealId, mockRestaurantId, updateDto, mockUser as User)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // --- No changes needed for the already passing tests below ---

  // describe('findAll', () => { /* ... */ });
  // describe('findByRestaurantId', () => { /* ... */ });
  // describe('deleteMeal', () => { /* ... */ });

  // Add back empty blocks for Jest to run them correctly
  describe('findAll', () => {
    it('should return all meals for an admin user', async () => {
      mealModel.find.mockReturnValue(mockMongooseQuery([mockMeal]));
      const result = await service.findAll(mockAdmin as User);
      expect(mealModel.find).toHaveBeenCalledWith();
      expect(result).toEqual([mockMeal]);
    });
    it('should return meals from owned or Fine Dining restaurants for a normal user', async () => {
      const accessibleRestaurants = [mockRestaurant, { ...mockRestaurant, category: Category.FINE_DINING }];
      restaurantModel.find.mockResolvedValue(accessibleRestaurants);
      mealModel.find.mockReturnValue(mockMongooseQuery([mockMeal]));
      await service.findAll(mockUser as User);
      expect(mealModel.find).toHaveBeenCalledWith({
        restaurant: { $in: accessibleRestaurants.map(r => r._id) },
      });
    });
    it('should throw UnauthorizedException for an invalid role', async () => {
      await expect(service.findAll({ _id: '123', role: 'GUEST' } as unknown as User)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findByRestaurantId', () => {
    it('should find meals for a valid restaurant ID for an authorized user', async () => {
      restaurantModel.base.isValidObjectId.mockReturnValue(true);
      restaurantModel.findById.mockResolvedValue(mockRestaurant);
      mealModel.find.mockReturnValue(mockMongooseQuery([mockMeal]));
      await service.findByRestaurantId(mockRestaurantId, mockUser as User);
      expect(mealModel.find).toHaveBeenCalledWith({ restaurant: mockRestaurantId });
    });
    it('should throw BadRequestException for an invalid restaurant ID', async () => {
      restaurantModel.base.isValidObjectId.mockReturnValue(false);
      await expect(service.findByRestaurantId('invalid-id', mockUser as User)).rejects.toThrow(BadRequestException);
    });
    it('should throw UnauthorizedException if a user tries to access a non-owned, non-Fine-Dining restaurant', async () => {
      restaurantModel.base.isValidObjectId.mockReturnValue(true);
      const otherUsersRestaurant = { ...mockRestaurant, user: new mongoose.Types.ObjectId(), category: Category.CAFE };
      restaurantModel.findById.mockResolvedValue(otherUsersRestaurant);
      await expect(service.findByRestaurantId(mockRestaurantId, mockUser as User)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteMeal', () => {
    it('should allow a User to delete a meal if they own the restaurant and it is Fine Dining', async () => {
      const populatedMeal = { ...mockMeal, restaurant: { ...mockRestaurant, category: Category.FINE_DINING } };
      mealModel.findById.mockReturnValue(mockMongooseQuery(populatedMeal));
      mealModel.findByIdAndDelete.mockResolvedValue(true);
      await service.deleteMeal(mockMealId, mockRestaurantId, mockUserId, UserRoles.USER);
      expect(mealModel.findByIdAndDelete).toHaveBeenCalledWith(mockMealId);
    });
    it("should throw UnauthorizedException if a User tries to delete a meal from someone else's Non-Fine Dining restaurant", async () => {
      const populatedMeal = { ...mockMeal, restaurant: { ...mockRestaurant, user: new mongoose.Types.ObjectId() } };
      mealModel.findById.mockReturnValue(mockMongooseQuery(populatedMeal));
      await expect(service.deleteMeal(mockMealId, mockRestaurantId, mockUserId, UserRoles.USER)).rejects.toThrow(UnauthorizedException);
    });
    it('should delete a meal successfully if the user is an admin', async () => {
      const populatedMeal = { ...mockMeal, restaurant: mockRestaurant };
      mealModel.findById.mockReturnValue(mockMongooseQuery(populatedMeal));
      mealModel.findByIdAndDelete.mockResolvedValue(true);
      await service.deleteMeal(mockMealId, mockRestaurantId, mockAdminId, UserRoles.ADMIN);
      expect(mealModel.findByIdAndDelete).toHaveBeenCalledWith(mockMealId);
    });
    it('should throw NotFoundException if the meal is not found', async () => {
      mealModel.findById.mockReturnValue(mockMongooseQuery(null));
      await expect(service.deleteMeal(mockMealId, mockRestaurantId, mockUserId, UserRoles.USER)).rejects.toThrow(NotFoundException);
    });
  });
});