import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantsService } from './restaurants.service';
import { getModelToken } from '@nestjs/mongoose';
import { Restaurant, Category } from './schemas/restaurant.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Query } from 'express-serve-static-core'

// ===================================================================
// ✨ SECTION 1: Tests for the 'create' method (Your Preferred Style) ✨
// ===================================================================
describe('RestaurantsService', () => {
  describe('create', () => {
    let service: RestaurantsService;
    let model: Model<Restaurant>;

    const mockAdmin = { _id: 'admin123', role: 'admin' };
    const mockUser = { _id: 'user123', role: 'user' };

    const createDto: CreateRestaurantDto = {
      name: 'Navayuga restaurant',
      description: 'description 26 Navayuga',
      email: 'Navayuga@gmail.com',
      phoneNo: 9123456780,
      category: Category.FINE_DINING,
      address: 'Visakhapatnam',
    };

    const mockSave = jest.fn().mockResolvedValue({
      populate: jest.fn().mockResolvedValue({
        ...createDto,
        user: { _id: mockUser._id, email: 'test@gmail.com', role: mockUser.role },
      }),
    });

    const mockRestaurantModelForCreate = jest.fn().mockImplementation(() => ({
      save: mockSave,
    }));

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RestaurantsService,
          {
            provide: getModelToken(Restaurant.name),
            useValue: mockRestaurantModelForCreate, // Use the specific mock for 'create'
          },
        ],
      }).compile();

      service = module.get<RestaurantsService>(RestaurantsService);
      model = module.get<Model<Restaurant>>(getModelToken(Restaurant.name));
      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('Admin creating any restaurant with any category should succeed', async () => {
      const result = await service.create({ ...createDto, category: Category.CAFE }, mockAdmin._id);
      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });

    it('User creating restaurant with Fine Dining category (created by self) should succeed', async () => {
      const result = await service.create({ ...createDto, category: Category.FINE_DINING }, mockUser._id);
      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });

    it('User creating restaurant with different category (self-created) should succeed', async () => {
      const result = await service.create({ ...createDto, category: Category.CAFE }, mockUser._id);
      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
    it('Admin creating restaurant with Fine Dining category should succeed', async () => {
      const result = await service.create({ ...createDto, category: Category.FINE_DINING }, mockAdmin._id);
      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ==================================================================================
  // ✨ SECTION 2: Tests for find, update, delete methods (Using a Different Mock) ✨
  // ==================================================================================
  describe('other methods (findAll, findById, updateById, deleteById)', () => {
    // Define mock data needed for these tests
    const mockRestaurant = {
      _id: '60c72b2f5f1b2c001f8e4d3b',
      name: 'Navayuga restaurant',
      user: { _id: 'user123' },
    };

    const mockUpdatedRestaurant = { ...mockRestaurant, name: 'Updated Name' };

    // This mock is for static methods like .find(), .findById(), etc.
    const mockModelForOtherMethods = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn().mockResolvedValue({ _id: 'deletedId' }),
    };

    let service: RestaurantsService;
    let model: Model<Restaurant>;

    const mockAdmin = { _id: 'admin456', role: 'admin' };
    const updateDto: UpdateRestaurantDto = {
      name: 'Updated Name',
      // description: '',
      // email: '',
      // phoneNo: 0,
      // address: '',
      // category: Category.FAST_FOOD
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RestaurantsService,
          {
            provide: getModelToken(Restaurant.name),
            useValue: mockModelForOtherMethods, // Use the specific mock for other methods
          },
        ],
      }).compile();

      service = module.get<RestaurantsService>(RestaurantsService);
      model = module.get<Model<Restaurant>>(getModelToken(Restaurant.name));
      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    // Test for findAll
    describe('findAll', () => {
      it('should find and return all restaurants based on query', async () => {
        // ARRANGE: Mock the entire chain for a successful find
        const mockQueryChain = {
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          populate: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockImplementation(() => ({
              populate: jest.fn().mockResolvedValue([mockRestaurant]),
            })),
          })),
        };
        (model.find as jest.Mock).mockReturnValue(mockQueryChain);

        const query = { keyword: 'restaurant', page: '1' } as unknown as Query;

        // ACT
        const result = await service.findAll(query);

        // ASSERT
        // 1. Check if the initial find was called with the keyword
        expect(model.find).toHaveBeenCalledWith({
          name: { $regex: 'restaurant', $options: 'i' },
        });

        // 2. Check if pagination methods were called correctly
        expect(mockQueryChain.limit).toHaveBeenCalledWith(10); // Assuming default resPerPage is 10
        expect(mockQueryChain.skip).toHaveBeenCalledWith(0); //  asserting that pagination correctly skips 0 documents when you're on the first page.

        // 3. Check the final result
        expect(result).toEqual([mockRestaurant]);
      });
    });

    // Test for findById
    describe('findById', () => {
      it('should find and return a restaurant by ID', async () => {
        (model.findById as jest.Mock).mockImplementation(() => ({
          populate: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockImplementation(() => ({
              populate: jest.fn().mockResolvedValue(mockRestaurant),
            })),
          })),
        }));
        jest.spyOn(mongoose, 'isValidObjectId').mockReturnValue(true);

        const result = await service.findById(mockRestaurant._id);
        expect(model.findById).toHaveBeenCalledWith(mockRestaurant._id);
        expect(result).toEqual(mockRestaurant);
      });
    });

    // Test for updateById
    describe('updateById', () => {
      it('should update and return a restaurant', async () => {
        (model.findByIdAndUpdate as jest.Mock).mockImplementation(() => ({
          populate: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockImplementation(() => ({
              populate: jest.fn().mockResolvedValue(mockUpdatedRestaurant),
            })),
          })),
        }));

        const result = await service.updateById(mockRestaurant._id, updateDto, mockAdmin._id);
        expect(model.findByIdAndUpdate).toHaveBeenCalled();
        expect(result).toEqual(mockUpdatedRestaurant);
      });
    });

    // Test for deleteById
    describe('deleteById', () => {
      it('should delete a restaurant', async () => {
        jest.spyOn(mongoose, 'isValidObjectId').mockReturnValue(true);
        const result = await service.deleteById('deletedId');
        expect(model.findByIdAndDelete).toHaveBeenCalledWith('deletedId');
        expect(result).toEqual({ _id: 'deletedId' });
      });
    });
  });
});
