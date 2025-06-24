import {
  Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards, UnauthorizedException, Patch,
} from '@nestjs/common';
import { MealService } from './meal.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRoles } from '../schemas/user.schema';

interface User {
  _id: string;
  role: string;

}

@Controller('meals')
export class MealController {
  constructor(private readonly mealService: MealService) { }

  // ✅ Create or update meal based on logic
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  //@UseGuards(AuthGuard(), RolesGuard)
  @Roles(UserRoles.ADMIN, UserRoles.USER)
  async createMeal(
    @Body() createMealDto: CreateMealDto,
    @Req() req: any,
  ) {
    // const userId = req.user._id.toString();  // ✅ Convert ObjectId to string

    const user = req.user as User;
    const userId = user._id.toString();
    const userRole = req.user.role;
    // const { _id: userId, role } = req.user;
    return this.mealService.createMeal(createMealDto, userId, userRole);
  }


  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  //@UseGuards(AuthGuard(), RolesGuard)
  @Roles(UserRoles.ADMIN, UserRoles.USER)
  async findAll(@Req() req: any) {
    const user = req.user;

    if (!user || !user.role) {
      throw new UnauthorizedException('User not found in request.');
    }
    // Send role + meals
    //console.log('Returning meals for role:', user.role);
    const meals = await this.mealService.findAll(user);
    return {
      role: user.role,
      meals,
    };
  }

  //  Get meals by restaurant ID 
  @Get('restaurant/:restaurantId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  //@UseGuards(AuthGuard(), RolesGuard)
  @Roles(UserRoles.ADMIN, UserRoles.USER)
  async findByRestaurantId(
    @Param('restaurantId') restaurantId: string,
    @Req() req: any,
  ) {
    return this.mealService.findByRestaurantId(restaurantId, req.user);
  }

  //Update meal based on  Restaurant ID 

  @Put(':mealId/restaurant/:restaurantId/')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  //@UseGuards(AuthGuard(), RolesGuard)
  @Roles(UserRoles.ADMIN, UserRoles.USER)
  async updateMealByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @Param('mealId') mealId: string,
    @Body() updateMealDto: UpdateMealDto,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.mealService.updateMealByRestaurant(mealId, restaurantId, updateMealDto, user);
  }

  // Delete a meal based on restaurant id 
  //@UseGuards(AuthGuard(), RolesGuard)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRoles.ADMIN, UserRoles.USER)
  @Delete(':mealId/restaurant/:restaurantId')
  async deleteMeal(
    @Param('mealId') mealId: string,
    @Param('restaurantId') restaurantId: string,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    const userId = user._id.toString();
    const role = user.role;

    return this.mealService.deleteMeal(mealId, restaurantId, userId, role);
  }
}
