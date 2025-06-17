import { Test, TestingModule } from '@nestjs/testing';
import { MealController } from './meal.controller';
import { MealService } from './meal.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import mongoose from 'mongoose';
import { UserRoles } from '../schemas/user.schema';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';
import { Category_meals } from './schemas/meal.schema';

// This is a mock of the MealService.
const mockMealService = {
  createMeal: jest.fn(),
  findAll: jest.fn(),
  findByRestaurantId: jest.fn(),
  updateMealByRestaurant: jest.fn(),
  deleteMeal: jest.fn(),
};

// --- MOCK DATA ---
const mockUserId = new mongoose.Types.ObjectId();
const mockAdminId = new mongoose.Types.ObjectId();
const mockRestaurantId = new mongoose.Types.ObjectId().toHexString();
const mockMealId = new mongoose.Types.ObjectId().toHexString();

const mockUser = {
  _id: mockUserId,
  role: UserRoles.USER,
  name: 'Test User',
};

const mockAdmin = {
  _id: mockAdminId,
  role: UserRoles.ADMIN,
  name: 'Test Admin',
};

const mockMeal = {
  _id: mockMealId,
  name: 'Test Meal',
  restaurant: mockRestaurantId,
  user: mockUserId.toHexString(),
};

describe('MealController', () => {
  let controller: MealController;
  let service: MealService;

  beforeEach(async () => {
    const mockAuthGuard = {
      canActivate: (context) => {
        const req = context.switchToHttp().getRequest();
        req.user = mockUser;
        return true;
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MealController],
      providers: [
        {
          provide: MealService,
          useValue: mockMealService,
        },
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(mockAuthGuard)
      .overrideGuard(AuthGuard())
      .useValue(mockAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<MealController>(MealController);
    service = module.get<MealService>(MealService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createMeal', () => {
    it('should create meal for USER', async () => {
      const createMealDto: CreateMealDto = {
        name: 'New Test Meal',
        description: 'A delicious test meal.',
        price: 25,
        //category: 'Main Course' as any,
        category: Category_meals.SALADS,
        restaurant: mockRestaurantId,
      };
      const mockReq = { user: mockUser };
      mockMealService.createMeal.mockResolvedValue(mockMeal);
      const result = await controller.createMeal(createMealDto, mockReq);
      expect(service.createMeal).toHaveBeenCalledWith(
        createMealDto,
        mockUser._id.toString(),
        mockUser.role,
      );
      expect(result).toEqual(mockMeal);
    });

    it('should create meal for ADMIN', async () => {
      const createMealDto: CreateMealDto = {
        name: 'Admin Meal',
        description: 'Meal created by admin',
        price: 40,
        category: Category_meals.SALADS,
        restaurant: mockRestaurantId,
      };
      const mockReq = { user: mockAdmin };
      mockMealService.createMeal.mockResolvedValue(mockMeal);
      const result = await controller.createMeal(createMealDto, mockReq);
      expect(service.createMeal).toHaveBeenCalledWith(
        createMealDto,
        mockAdmin._id.toString(),
        mockAdmin.role,
      );
      expect(result).toEqual(mockMeal);
    });
  });

  describe('findAll', () => {
    it('should return meals for USER', async () => {
      const mockMeals = [mockMeal];
      const mockReq = { user: mockUser };
      mockMealService.findAll.mockResolvedValue(mockMeals);
      const result = await controller.findAll(mockReq);
      expect(service.findAll).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        role: mockUser.role,
        meals: mockMeals,
      });
    });

    it('should return meals for ADMIN', async () => {
      const mockMeals = [mockMeal];
      const mockReq = { user: mockAdmin };
      mockMealService.findAll.mockResolvedValue(mockMeals);
      const result = await controller.findAll(mockReq);
      expect(service.findAll).toHaveBeenCalledWith(mockAdmin);
      expect(result).toEqual({
        role: mockAdmin.role,
        meals: mockMeals,
      });
    });
  });

  describe('findByRestaurantId', () => {
    it('should return meals for USER', async () => {
      const mockReq = { user: mockUser };
      mockMealService.findByRestaurantId.mockResolvedValue([mockMeal]);
      const result = await controller.findByRestaurantId(mockRestaurantId, mockReq);
      expect(service.findByRestaurantId).toHaveBeenCalledWith(mockRestaurantId, mockUser);
      expect(result).toEqual([mockMeal]);
    });

    it('should return meals for ADMIN', async () => {
      const mockReq = { user: mockAdmin };
      mockMealService.findByRestaurantId.mockResolvedValue([mockMeal]);
      const result = await controller.findByRestaurantId(mockRestaurantId, mockReq);
      expect(service.findByRestaurantId).toHaveBeenCalledWith(mockRestaurantId, mockAdmin);
      expect(result).toEqual([mockMeal]);
    });
  });

  describe('updateMealByRestaurant', () => {
    it('should update meal for USER', async () => {
      const updateMealDto: UpdateMealDto = { name: 'Updated by user' };
      const mockReq = { user: mockUser };
      const updatedMeal = { ...mockMeal, ...updateMealDto };
      mockMealService.updateMealByRestaurant.mockResolvedValue(updatedMeal);
      const result = await controller.updateMealByRestaurant(
        mockRestaurantId,
        mockMealId,
        updateMealDto,
        mockReq,
      );
      expect(service.updateMealByRestaurant).toHaveBeenCalledWith(
        mockMealId,
        mockRestaurantId,
        updateMealDto,
        mockUser,
      );
      expect(result).toEqual(updatedMeal);
    });

    it('should update meal for ADMIN', async () => {
      const updateMealDto: UpdateMealDto = { name: 'Updated by admin' };
      const mockReq = { user: mockAdmin };
      const updatedMeal = { ...mockMeal, ...updateMealDto };
      mockMealService.updateMealByRestaurant.mockResolvedValue(updatedMeal);
      const result = await controller.updateMealByRestaurant(
        mockRestaurantId,
        mockMealId,
        updateMealDto,
        mockReq,
      );
      expect(service.updateMealByRestaurant).toHaveBeenCalledWith(
        mockMealId,
        mockRestaurantId,
        updateMealDto,
        mockAdmin,
      );
      expect(result).toEqual(updatedMeal);
    });
  });

  describe('deleteMeal', () => {
    it('should delete meal for USER', async () => {
      const mockReq = { user: mockUser };
      const successMessage = { message: 'Meal deleted successfully' };
      mockMealService.deleteMeal.mockResolvedValue(successMessage);
      const result = await controller.deleteMeal(
        mockMealId,
        mockRestaurantId,
        mockReq as any,
      );
      expect(service.deleteMeal).toHaveBeenCalledWith(
        mockMealId,
        mockRestaurantId,
        mockUser._id.toString(),
        mockUser.role,
      );
      expect(result).toEqual(successMessage);
    });

    it('should delete meal for ADMIN', async () => {
      const mockReq = { user: mockAdmin };
      const successMessage = { message: 'Meal deleted successfully' };
      mockMealService.deleteMeal.mockResolvedValue(successMessage);
      const result = await controller.deleteMeal(
        mockMealId,
        mockRestaurantId,
        mockReq as any,
      );
      expect(service.deleteMeal).toHaveBeenCalledWith(
        mockMealId,
        mockRestaurantId,
        mockAdmin._id.toString(),
        mockAdmin.role,
      );
      expect(result).toEqual(successMessage);
    });
  });
});
