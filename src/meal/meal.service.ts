import { Injectable, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { CreateMealDto } from './dto/create-meal.dto';
import { Meal } from './schemas/meal.schema';
import { UpdateMealDto } from './dto/update-meal.dto';
import { Restaurant, Category } from '../restaurants/schemas/restaurant.schema';
import { UserRoles } from '../schemas/user.schema';

@Injectable()
export class MealService {
  constructor(
    @InjectModel(Meal.name) private mealModel: Model<Meal>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<Restaurant>,
  ) { }
  //CREATE A MEAL 
  async createMeal(createMealDto: CreateMealDto, userId: string, userRole: string) {
    const restaurant = await this.restaurantModel.findById(createMealDto.restaurant);
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    if (
      userRole !== 'admin' &&
      !(
        restaurant.category === 'Fine Dining' ||
        restaurant.user.toString() === userId
      )
    ) {
      throw new ForbiddenException('You do not own this restaurant or lack permissions');
    }

    const normalizedMealName = createMealDto.name.trim().toLowerCase();

    // Check if meal exists
    let meal = await this.mealModel.findOne({
      name: normalizedMealName,
      restaurant: restaurant._id,
    });

    if (meal) {
      // 🔄 Update existing meal
      meal.description = createMealDto.description;
      meal.price = createMealDto.price;
      meal.category = createMealDto.category;
      meal.user = new mongoose.Types.ObjectId(userId);

      await meal.save();
    } else {
      // ➕ Create new meal
      meal = new this.mealModel({
        ...createMealDto,
        name: normalizedMealName,
        restaurant: restaurant._id,
        user: userId,
      });

      await meal.save();

      // Link to restaurant
      restaurant.meals = restaurant.meals || [];
      //restaurant.meals.push(meal._id);
      restaurant.meals.push(meal._id as Types.ObjectId);
      await restaurant.save();
    }

    return this.mealModel.findById(meal._id).populate('restaurant user').exec();
  }

  //GET ALL MEALS 

  async findAll(user: any): Promise<Meal[]> {
    const role = user.role.toLowerCase();

    if (role === UserRoles.ADMIN) {
      // ✅ Admin gets all meals
      return this.mealModel.find().populate('restaurant');
    }

    if (role === UserRoles.USER) {
      // ✅ User gets meals from:
      // - Fine Dining restaurants (by anyone)
      // - OR restaurants they own (any category)
      const accessibleRestaurants = await this.restaurantModel.find({
        $or: [
          { category: 'Fine Dining' },
          { user: user._id },
          //{role: user.roles}
        ],
      });

      const restaurantIds = accessibleRestaurants.map((r) => r._id);

      return this.mealModel
        .find({ restaurant: { $in: restaurantIds } })
        .populate('restaurant');
    }

    throw new UnauthorizedException('Invalid role for accessing meals.');
  }

  //MEAL BASED ON RESTAURANT ID 
  async findByRestaurantId(restaurantId: string, user: any): Promise<Meal[]> {
    // 1. Validate restaurantId first
    if (!restaurantId || !this.restaurantModel.base.isValidObjectId(restaurantId)) {
      throw new BadRequestException('Invalid restaurant ID provided.');
    }

    // 2. Fetch the restaurant to determine access
    const restaurant = await this.restaurantModel.findById(restaurantId);

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found.');
    }

    // 3. Authorization Logic
    if (user.role === UserRoles.ADMIN) {
      // Admin can view meals for any restaurant
      return this.mealModel.find({ restaurant: restaurantId }).populate('restaurant');
    }

    // For a normal user (UserRoles.USER)
    if (user.role === UserRoles.USER) {
      const ownsRestaurant = restaurant.user.toString() === user._id.toString();
      const isFineDining = restaurant.category === Category.FINE_DINING; // ✅ Corrected property name

      // A user can view meals if:
      // a. The restaurant is Fine Dining (regardless of ownership)
      // OR
      // b. The user owns the restaurant (regardless of category)
      if (!isFineDining && !ownsRestaurant) {
        throw new UnauthorizedException(
          'You can only view meals from Fine Dining restaurants or restaurants you own.'
        );
      }

      // If authorized, fetch meals for this restaurant
      return this.mealModel.find({ restaurant: restaurantId }).populate('restaurant');
    }

    // Fallback for any other unexpected roles (should be caught by RolesGuard, but good for safety)
    throw new UnauthorizedException('Access denied for this role.');
  }

  //UPDATE MEAL BASED ON RESTAURANT ID 

  async updateMealByRestaurant(
    mealId: string,
    restaurantId: string,
    updateMealDto: UpdateMealDto,
    user: any,
  ): Promise<Meal> {
    if (!mongoose.Types.ObjectId.isValid(mealId)) {
      throw new BadRequestException('Invalid meal ID provided.');
    }
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      throw new BadRequestException('Invalid restaurant ID provided.');
    }

    const restaurant = await this.restaurantModel.findById(restaurantId);
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const userRole = user.role?.toLowerCase();
    const isOwner = restaurant.user && restaurant.user.toString() === user._id.toString();
    const isFineDining = restaurant.category === Category.FINE_DINING;

    if (userRole !== 'admin' && !isOwner && !isFineDining) {
      throw new ForbiddenException('You are not allowed to update meals for this restaurant');
    }

    const meal = await this.mealModel.findById(mealId);
    if (!meal) throw new NotFoundException('Meal not found');

    if (meal.restaurant.toString() !== restaurantId) {
      throw new BadRequestException('Meal does not belong to the specified restaurant');
    }

    // Object.assign(meal, updateMealDto); // Works
    meal.set(updateMealDto); // Mongoose preferred way
    meal.user = new mongoose.Types.ObjectId(user._id);
    await meal.save();

    // Explicitly handle potential null from findById after save
    const updatedAndPopulatedMeal = await this.mealModel.findById(meal._id).populate('restaurant user').exec();
    if (!updatedAndPopulatedMeal) {
      // This would be an unexpected error if save() was successful
      throw new InternalServerErrorException(`Failed to retrieve meal with id ${meal._id} after update.`);
    }
    return updatedAndPopulatedMeal;
  }

  //DELETE A MEAL 

  async deleteMeal(
    mealId: string,
    restaurantId: string,
    userId: string,
    role: string,
  ): Promise<{ message: string }> {
    const meal = await this.mealModel.findById(mealId).populate('restaurant').populate('user');

    //console.log(meal);
    console.log(restaurantId);
    //  if (!meal || meal.restaurant.toString() !== restaurantId) {
    //   throw new NotFoundException('Meal not found or already deleted');
    // }

    if (!meal || (meal.restaurant as any)._id.toString() !== restaurantId) {
      throw new NotFoundException('Meal not found or already deleted');
    }


    if (role === 'admin') {
      // Admin can delete any meal directly
      await this.mealModel.findByIdAndDelete(mealId);
      return { message: 'Meal deleted successfully by admin' };
    }



    // User role checks
    const mealCreatorId = (meal.user as any)._id.toString();
    const restaurantCategory = (meal.restaurant as any).category;
    const restaurantCreatorId = (meal.restaurant as any).user.toString();

    if (role === 'user') {
      if (restaurantCreatorId !== userId) {
        throw new UnauthorizedException('You are not the owner of this restaurant');
      }

      if (restaurantCategory !== 'Fine Dining') {
        throw new UnauthorizedException('Only meals under Fine Dining can be deleted by you');
      }

      if (mealCreatorId !== userId) {
        throw new UnauthorizedException('You are not authorized to delete this meal');
      }
    }

    await this.mealModel.findByIdAndDelete(mealId);
    return { message: 'Meal deleted successfully' };
  }
}
