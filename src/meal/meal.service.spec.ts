import { Test, TestingModule } from '@nestjs/testing';
import { MealService } from './meal.service';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import mongoose from 'mongoose';
import { Category_meals, Meal } from './schemas/meal.schema';
import { CreateMealDto } from './dto/create-meal.dto';
import { Category, Restaurant } from '../restaurants/schemas/restaurant.schema';
import { UserRoles } from '../schemas/user.schema';

type MockModel<T = any> = jest.Mock & {
  findById: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  findByIdAndDelete: jest.Mock;
  base: {
    isValidObjectId: jest.Mock;
  };
};

const createMockModel = <T = any>(): MockModel<T> => {
  const model: any = jest.fn();
  model.findById = jest.fn();
  model.findOne = jest.fn();
  model.find = jest.fn();
  model.create = jest.fn();
  model.save = jest.fn();
  model.findByIdAndDelete = jest.fn();
  model.base = {
    isValidObjectId: jest.fn().mockImplementation((id) => mongoose.Types.ObjectId.isValid(id)),
  };
  return model;
};

// --- MOCK DATA (No changes here) ---
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
  user: new mongoose.Types.ObjectId(mockUserId),
  meals: [],
  save: jest.fn().mockResolvedValue(this),
  toString: () => mockRestaurantId,
};

const mockFineDiningRestaurant = {
  ...mockRestaurant,
  _id: new mongoose.Types.ObjectId(),
  category: Category.FINE_DINING,
};

const mockMeal = {
  _id: new mongoose.Types.ObjectId(mockMealId),
  name: 'Test Meal',
  description: 'A delicious test meal.',
  price: 15,
  category: Category_meals.MAIN_COURSE,
  restaurant: new mongoose.Types.ObjectId(mockRestaurantId),
  user: new mongoose.Types.ObjectId(mockUserId),
  save: jest.fn().mockResolvedValue(this),
  set: jest.fn().mockReturnThis(),
};


describe('MealService', () => {
  let service: MealService;
  let mealModel: MockModel<Meal>;
  let restaurantModel: MockModel<Restaurant>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealService,
        {
          provide: getModelToken(Meal.name),
          useValue: createMockModel<Meal>(),
        },
        {
          provide: getModelToken(Restaurant.name),
          useValue: createMockModel<Restaurant>(),
        },
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
    const createMealDto = {
      name: 'New Burger',
      description: 'A great burger',
      price: 12,
      category: Category_meals.MAIN_COURSE,
      restaurant: mockRestaurantId,
    };

    it('should create a new meal if it does not exist', async () => {
      restaurantModel.findById.mockResolvedValue(mockRestaurant as any);
      mealModel.findOne.mockResolvedValue(null);

      const mealInstance = { ...mockMeal, save: jest.fn().mockResolvedValue(mockMeal) };
      mealModel.mockImplementation(() => mealInstance);

      const populatedMeal = { populate: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(mealInstance) };
      mealModel.findById.mockReturnValue(populatedMeal as any);

      const result = await service.createMeal(createMealDto, mockUser._id.toHexString(), mockUser.role);

      expect(restaurantModel.findById).toHaveBeenCalledWith(createMealDto.restaurant);
      expect(mealModel.findOne).toHaveBeenCalledWith({
        name: createMealDto.name.trim().toLowerCase(),
        restaurant: mockRestaurant._id,
      });
      expect(mealModel).toHaveBeenCalled();
      expect(mealInstance.save).toHaveBeenCalled();
      expect(mockRestaurant.save).toHaveBeenCalled();
      expect(result).toEqual(mealInstance);
    });

    it('should update an existing meal if found by name and restaurant', async () => {
      const existingMeal = { ...mockMeal, save: jest.fn().mockResolvedValue(this) };
      restaurantModel.findById.mockResolvedValue(mockRestaurant as any);
      mealModel.findOne.mockResolvedValue(existingMeal as any);

      const populatedMeal = { ...existingMeal, populate: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(existingMeal) };
      mealModel.findById.mockReturnValue(populatedMeal as any);

      const result = await service.createMeal(createMealDto, mockUser._id.toHexString(), mockUser.role);

      expect(existingMeal.description).toBe(createMealDto.description);
      expect(existingMeal.price).toBe(createMealDto.price);
      expect(existingMeal.save).toHaveBeenCalled();
      expect(mockRestaurant.save).not.toHaveBeenCalled();
      expect(result).toEqual(existingMeal);
    });

    it('should throw NotFoundException if restaurant is not found', async () => {
      restaurantModel.findById.mockResolvedValue(null);
      await expect(service.createMeal(createMealDto, mockUser._id.toHexString(), mockUser.role)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner or admin for a non-Fine-Dining restaurant', async () => {
      const otherUserRestaurant = { ...mockRestaurant, user: new mongoose.Types.ObjectId() };
      restaurantModel.findById.mockResolvedValue(otherUserRestaurant as any);
      await expect(service.createMeal(createMealDto, mockUser._id.toHexString(), mockUser.role)).rejects.toThrow(ForbiddenException);
    });


    it('should allow USER to create a meal for their own Fine Dining restaurant', async () => {
      const userId = mockUser._id.toString();

      // Mock a Fine Dining restaurant owned by the user
      const fineDiningRestaurant = {
        _id: mockRestaurantId,
        user: new mongoose.Types.ObjectId(userId),
        category: Category.FINE_DINING,
        meals: [],
        save: jest.fn().mockResolvedValue(true),
      };

      // No meal exists with that name
      restaurantModel.findById.mockResolvedValue(fineDiningRestaurant as any);
      mealModel.findOne.mockResolvedValue(null);

      // Mock meal instance creation
      const mealInstance = { ...mockMeal, save: jest.fn().mockResolvedValue(mockMeal) };
      mealModel.mockImplementation(() => mealInstance);

      const populatedMeal = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mealInstance),
      };
      mealModel.findById.mockReturnValue(populatedMeal as any);

      const result = await service.createMeal(createMealDto, userId, UserRoles.USER);

      expect(restaurantModel.findById).toHaveBeenCalledWith(createMealDto.restaurant); // Did it look for the restaurant by ID?
      expect(mealModel.findOne).toHaveBeenCalledWith({  // Did it check if the meal with the same name already exists for that restaurant?
        name: createMealDto.name.trim().toLowerCase(),
        restaurant: fineDiningRestaurant._id,
      });
      expect(mealModel).toHaveBeenCalled(); // Did it try to create the new meal?
      expect(mealInstance.save).toHaveBeenCalled(); // Did the meal get saved?
      expect(result).toEqual(mealInstance); //Was the final result the created meal?
    });
  });


  it('should allow user to create meal for a Fine Dining restaurant not owned by them', async () => {
    // Setup: a logged-in user and a restaurant owned by someone else
    const loggedInUserId = new mongoose.Types.ObjectId().toHexString();
    const anotherUserId = new mongoose.Types.ObjectId();
    const fineDiningRestaurantId = new mongoose.Types.ObjectId();

    // This is a Fine Dining restaurant owned by another user
    const restaurant = {
      _id: fineDiningRestaurantId,
      user: anotherUserId,
      category: Category.FINE_DINING, // The important part
      meals: [],
      save: jest.fn().mockResolvedValue(true),
    };

    const createMealDto: CreateMealDto = {
      name: 'Special Salad',
      description: 'Fresh and healthy.',
      price: 20,
      category: Category_meals.SALADS,
      restaurant: restaurant._id.toString(),
    };

    // 1. Mock finding the restaurant (it exists and is Fine Dining)
    restaurantModel.findById.mockResolvedValue(restaurant as any);
    // 2. Mock finding the meal (it doesn't exist yet)
    mealModel.findOne.mockResolvedValue(null);

    // 3. Mock the creation of the new meal instance and its save method
    const createdMealInstance = {
      ...createMealDto,
      _id: new mongoose.Types.ObjectId(),
      user: loggedInUserId,
      save: jest.fn().mockResolvedValue(this),
    };
    mealModel.mockImplementation(() => createdMealInstance);

    // 4. Mock the final populate call after creation
    const populatedMeal = {
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(createdMealInstance),
    };
    mealModel.findById.mockReturnValue(populatedMeal as any);

    const result = await service.createMeal(createMealDto, loggedInUserId, UserRoles.USER);

    // Assertions
    expect(restaurantModel.findById).toHaveBeenCalledWith(createMealDto.restaurant);
    expect(createdMealInstance.save).toHaveBeenCalled();
    expect(result).toEqual(createdMealInstance);
  });

  describe('findAll', () => {
    it('should return all meals for an admin user', async () => {
      const mockFind = { populate: jest.fn().mockResolvedValue([mockMeal]) };
      mealModel.find.mockReturnValue(mockFind as any);

      const result = await service.findAll(mockAdmin);
      expect(mealModel.find).toHaveBeenCalledWith();
      expect(result).toEqual([mockMeal]);
    });

    it('should return meals from owned or Fine Dining restaurants for a normal user', async () => {
      const accessibleRestaurants = [mockRestaurant, mockFineDiningRestaurant];
      const restaurantIds = accessibleRestaurants.map(r => r._id);
      restaurantModel.find.mockResolvedValue(accessibleRestaurants as any);

      const mockMealFind = { populate: jest.fn().mockResolvedValue([mockMeal]) };
      mealModel.find.mockReturnValue(mockMealFind as any);

      const result = await service.findAll(mockUser);

      expect(restaurantModel.find).toHaveBeenCalledWith({
        $or: [
          //{ category: 'Fine Dining' },
          { category: Category.FINE_DINING },
          { user: mockUser._id },
        ],
      });
      expect(mealModel.find).toHaveBeenCalledWith({ restaurant: { $in: restaurantIds } });
      expect(result).toEqual([mockMeal]);
    });

    it('should throw UnauthorizedException for an invalid role', async () => {
      await expect(service.findAll({ _id: '123', role: 'GUEST' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findByRestaurantId', () => {
    it('should find meals for a valid restaurant ID for an authorized user', async () => {
      restaurantModel.findById.mockResolvedValue(mockRestaurant as any);
      const findResult = { populate: jest.fn().mockResolvedValue([mockMeal]) };
      mealModel.find.mockReturnValue(findResult as any);

      const result = await service.findByRestaurantId(mockRestaurantId, mockUser);

      expect(restaurantModel.base.isValidObjectId).toHaveBeenCalledWith(mockRestaurantId);
      expect(restaurantModel.findById).toHaveBeenCalledWith(mockRestaurantId);
      expect(mealModel.find).toHaveBeenCalledWith({ restaurant: mockRestaurantId });
      expect(result).toEqual([mockMeal]);
    });

    it('should throw BadRequestException for an invalid restaurant ID', async () => {
      const invalidId = 'not-an-id';
      await expect(service.findByRestaurantId(invalidId, mockUser)).rejects.toThrow(BadRequestException);
      expect(restaurantModel.base.isValidObjectId).toHaveBeenCalledWith(invalidId);
    });

    it('should throw UnauthorizedException if a user tries to access a non-owned, non-Fine-Dining restaurant', async () => {
      const otherUsersRestaurant = {
        ...mockRestaurant,
        user: new mongoose.Types.ObjectId(),
        category: Category.CAFE
      };
      restaurantModel.findById.mockResolvedValue(otherUsersRestaurant as any);

      await expect(service.findByRestaurantId(mockRestaurantId, mockUser)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateMealByRestaurant', () => {
    const updateDto = { name: 'Updated Meal Name' };

    it('should update a meal successfully for an admin', async () => {
      restaurantModel.findById.mockResolvedValue(mockRestaurant as any);

      const findByIdResultForUpdate = { populate: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(mockMeal) };
      mealModel.findById
        .mockResolvedValueOnce(mockMeal as any)
        .mockReturnValueOnce(findByIdResultForUpdate as any);

      const result = await service.updateMealByRestaurant(mockMealId, mockRestaurantId, updateDto, mockAdmin);

      expect(mockMeal.set).toHaveBeenCalledWith(updateDto);
      expect(mockMeal.save).toHaveBeenCalled();
      expect(result).toEqual(mockMeal);
    });

    it('should throw BadRequestException if meal does not belong to the restaurant', async () => {
      restaurantModel.findById.mockResolvedValue(mockRestaurant as any);
      const mealFromAnotherRestaurant = { ...mockMeal, restaurant: new mongoose.Types.ObjectId() };
      mealModel.findById.mockResolvedValue(mealFromAnotherRestaurant as any);

      await expect(service.updateMealByRestaurant(mockMealId, mockRestaurantId, updateDto, mockAdmin)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if meal is not found', async () => {
      restaurantModel.findById.mockResolvedValue(mockRestaurant as any);
      mealModel.findById.mockResolvedValue(null);

      await expect(service.updateMealByRestaurant(mockMealId, mockRestaurantId, updateDto, mockAdmin)).rejects.toThrow(NotFoundException);
    });

    // Add these test cases inside the describe('updateMealByRestaurant', ...) block in your test file.

    // Scenario 1: User updates meal only if they own the restaurant or it’s Fine Dining (positive)
    // This test validates the "it's Fine Dining" part of the condition.
    it("should allow a User to update a meal if it's in a Fine Dining restaurant they don't own", async () => {
      const updateDto = { price: 250 };

      // Setup: The meal is in a restaurant that is Fine Dining but owned by another user.
      const fineDiningRestaurant = {
        _id: new mongoose.Types.ObjectId().toHexString(),
        user: new mongoose.Types.ObjectId(), // Belongs to someone else
        category: Category.FINE_DINING, // The key condition for allowing access
      };

      const mealToUpdate = {
        ...mockMeal,
        restaurant: fineDiningRestaurant._id,
        set: jest.fn().mockReturnThis(),
        save: jest.fn().mockResolvedValue(this),
      };

      restaurantModel.findById.mockResolvedValue(fineDiningRestaurant as any);

      // The service calls findById twice, once to check the meal, once to return the populated result.
      const findByIdResultForUpdate = { populate: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(mealToUpdate) };
      mealModel.findById
        .mockResolvedValueOnce(mealToUpdate as any)
        .mockReturnValueOnce(findByIdResultForUpdate as any);

      const result = await service.updateMealByRestaurant(
        mockMealId,
        fineDiningRestaurant._id,
        updateDto,
        mockUser // The user making the request
      );

      // Assertions
      expect(restaurantModel.findById).toHaveBeenCalledWith(fineDiningRestaurant._id);
      expect(mealModel.findById).toHaveBeenCalledWith(mockMealId);
      expect(mealToUpdate.set).toHaveBeenCalledWith(updateDto);
      expect(mealToUpdate.save).toHaveBeenCalled();
      expect(result).toEqual(mealToUpdate);
    });


    // Scenario 2: User tries to update meal for other user's Non-Fine Dining restaurant 


    it("should throw ForbiddenException when a User tries to update a meal for another user's Non-Fine Dining restaurant", async () => {
      const updateDto = { price: 25 };

      // Setup: The restaurant is NOT Fine Dining and is owned by another user.
      const otherUsersRestaurant = {
        _id: new mongoose.Types.ObjectId().toHexString(),
        user: new mongoose.Types.ObjectId(), // Belongs to someone else
        category: Category.CAFE, // The key condition: NOT Fine Dining
      };

      // We don't need to mock mealToUpdate here, as the code won't reach the meal lookup.
      restaurantModel.findById.mockResolvedValue(otherUsersRestaurant as any);

      // We DON'T mock mealModel.findById because it should not be called.

      // Assertion
      await expect(
        service.updateMealByRestaurant(
          mockMealId,
          otherUsersRestaurant._id,
          updateDto,
          mockUser // The user making the request
        )
      ).rejects.toThrow(ForbiddenException);

      // ========= THE FIX IS HERE =========
      // Verify we checked the restaurant, which caused the failure.
      expect(restaurantModel.findById).toHaveBeenCalledWith(otherUsersRestaurant._id);

      // Verify that the code correctly exited BEFORE trying to find the meal.
      expect(mealModel.findById).not.toHaveBeenCalled();
    });
  });

  // =================== CORRECTED BLOCK START ===================
  describe('deleteMeal', () => {
    // This is the fully populated object the service expects after the query resolves
    const populatedMealForDelete = {
      _id: new mongoose.Types.ObjectId(mockMealId),
      restaurant: {
        _id: new mongoose.Types.ObjectId(mockRestaurantId),
        category: Category.FINE_DINING,
        user: new mongoose.Types.ObjectId(mockUserId).toString(), // Ensure it's a string for comparison
      },
      user: {
        _id: new mongoose.Types.ObjectId(mockUserId),
      }
    };
  });
  const setupMongooseQueryMock = (resolveValue: any) => {
    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      // Since the service `await`s the query directly, we mock `then` which is what `await` uses.
      then: jest.fn((callback) => callback(resolveValue)),
    };
    // Note: It's important that `mealModel` is defined in the higher scope for this to work.
    mealModel.findById.mockReturnValue(mockQuery as any);
    return mockQuery;
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // The deleteMeal block now correctly uses the helper function defined above.
  describe('deleteMeal', () => {

    // Test Case 1: Positive case for User deletion
    it('should allow a User to delete a meal if they own the restaurant and it is Fine Dining', async () => {
      // Arrange
      const requestingUserId = new mongoose.Types.ObjectId().toHexString();
      const restaurantId = new mongoose.Types.ObjectId().toHexString();
      const mealId = new mongoose.Types.ObjectId().toHexString();

      const mockPopulatedMeal = {
        _id: mealId,
        user: { _id: new mongoose.Types.ObjectId(requestingUserId) },
        restaurant: {
          _id: new mongoose.Types.ObjectId(restaurantId),
          category: Category.FINE_DINING,
          user: new mongoose.Types.ObjectId(requestingUserId),
        },
      };

      setupMongooseQueryMock(mockPopulatedMeal);
      mealModel.findByIdAndDelete.mockResolvedValue(mockPopulatedMeal);

      // Act
      const result = await service.deleteMeal(mealId, restaurantId, requestingUserId, UserRoles.USER);

      // Assert
      expect(mealModel.findById).toHaveBeenCalledWith(mealId);
      expect(mealModel.findByIdAndDelete).toHaveBeenCalledWith(mealId);
      expect(result).toEqual({ message: 'Meal deleted successfully' });
    });


    // Test Case 2: Negative case for User deletion
    it("should throw UnauthorizedException if a User tries to delete a meal from someone else's Non-Fine Dining restaurant", async () => {
      // Arrange
      const requestingUserId = new mongoose.Types.ObjectId().toHexString();
      const ownerId = new mongoose.Types.ObjectId();
      const restaurantId = new mongoose.Types.ObjectId().toHexString();
      const mealId = new mongoose.Types.ObjectId().toHexString();

      const mockPopulatedMeal = {
        _id: mealId,
        user: { _id: ownerId },
        restaurant: {
          _id: new mongoose.Types.ObjectId(restaurantId),
          category: Category.CAFE,
          user: ownerId,
        },
      };

      setupMongooseQueryMock(mockPopulatedMeal);

      // Act & Assert
      await expect(
        service.deleteMeal(mealId, restaurantId, requestingUserId, UserRoles.USER)
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.deleteMeal(mealId, restaurantId, requestingUserId, UserRoles.USER)
      ).rejects.toThrow('You are not the owner of this restaurant');

      expect(mealModel.findById).toHaveBeenCalledWith(mealId);
      expect(mealModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    // Other tests for deleteMeal
    it('should delete a meal successfully if the user is an admin', async () => {
      const mockPopulatedMeal = {
        restaurant: { _id: new mongoose.Types.ObjectId(mockRestaurantId) }
      };
      setupMongooseQueryMock(mockPopulatedMeal);
      mealModel.findByIdAndDelete.mockResolvedValue(true);

      const result = await service.deleteMeal(mockMealId, mockRestaurantId, mockAdmin._id.toHexString(), mockAdmin.role);

      expect(mealModel.findById).toHaveBeenCalledWith(mockMealId);
      expect(mealModel.findByIdAndDelete).toHaveBeenCalledWith(mockMealId);
      expect(result).toEqual({ message: 'Meal deleted successfully by admin' });
    });

    it('should throw NotFoundException if the meal is not found', async () => {
      setupMongooseQueryMock(null);

      await expect(
        service.deleteMeal(mockMealId, mockRestaurantId, mockUser._id.toHexString(), mockUser.role)
      ).rejects.toThrow(NotFoundException);

      expect(mealModel.findById).toHaveBeenCalledWith(mockMealId);
      expect(mealModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });
});

