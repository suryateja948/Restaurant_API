import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Query as ExpressQuery } from 'express-serve-static-core';
import { RestaurantsService } from './restaurants.service';
import { Category, Restaurant } from './schemas/restaurant.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { AuthGuard } from '@nestjs/passport';
import { User, UserRoles } from '../schemas/user.schema';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('restaurants')
export class RestaurantsController {
    constructor(private restaurantService: RestaurantsService) { }

    //Get all the restaurants 

    @Get()
    @UseGuards(AuthGuard(), RolesGuard)
    @Roles(UserRoles.ADMIN, UserRoles.USER)
    async getAllRestaurants(@Query() query: ExpressQuery, @Req() req: any): Promise<Restaurant[]> {
        const user = req['user'];

        if (user.role === UserRoles.ADMIN) {
            return this.restaurantService.findAll(query);
        } else if (user.role === UserRoles.USER) {
            return this.restaurantService.findFineDiningOrOwned(query, user._id);
        } else {
            throw new UnauthorizedException('Invalid role');
        }
    }

    // Create Restaurant 
    @Post()
    @Roles(UserRoles.ADMIN, UserRoles.USER)
    @UseGuards(AuthGuard(), RolesGuard)
    async createRestaurant(
        @Body() restaurant: CreateRestaurantDto,
        @Req() req: any // get logged-in user
    ): Promise<Restaurant> {
        const user = req.user;
        // return this.restaurantService.create(restaurant, user._id);
        return this.restaurantService.create(restaurant, user);
    }
    //Get Restaurants Based on ID 

    @Get(':id')
    @Roles(UserRoles.ADMIN, UserRoles.USER)
    @UseGuards(AuthGuard(), RolesGuard)
    async getRestaurant(
        @Param('id')
        id: string,
    ): Promise<Restaurant> {
        return this.restaurantService.findById(id);
    }

    //UPDATE RESTAURANTS BASED ON ID 

    @Put(':id')
    @Roles(UserRoles.ADMIN, UserRoles.USER) // RolesGuard will check if user has one of these roles
    @UseGuards(AuthGuard(), RolesGuard)     // AuthGuard runs first, then RolesGuard
    async updateRestaurant(
        @Param('id') id: string,
        @Body() restaurant: UpdateRestaurantDto,
        @Req() req: any,
    ): Promise<Restaurant> {
        const user = req.user;

        const existingRestaurant = await this.restaurantService.findById(id);

        if (!existingRestaurant) {
            throw new NotFoundException(`Restaurant with ID "${id}" not found.`);
        }

        // ADMIN can always update
        if (user.role === UserRoles.USER) {
            // Safe handling for both populated and unpopulated 'user' field
            const restaurantOwnerId = (existingRestaurant.user as any)._id?.toString?.() ?? existingRestaurant.user.toString();
            const currentUserId = user._id.toString();
            const ownsRestaurant = restaurantOwnerId === currentUserId;

            const isFineDining = existingRestaurant.category === Category.FINE_DINING;
            // Deny if it's not Fine Dining and not owned
            if (!ownsRestaurant && !isFineDining) {
                throw new UnauthorizedException(
                    'You can only update Fine Dining restaurants or restaurants that you own.'
                );
            }
        }

        // Proceed to update
        return await this.restaurantService.updateById(id, restaurant, user._id);
    }

    // DELETE RESTAURANT BASED ON ID 

    @Delete(':id')
    @Roles(UserRoles.ADMIN, UserRoles.USER)
    @UseGuards(AuthGuard(), RolesGuard)
    async deleteRestaurant(
        @Param('id') id: string,
        @Req() req: any,
    ): Promise<{ deleted: boolean; message: string }> {
        const user = req.user;
        const deletedRestaurant = await this.restaurantService.deleteById(id);

        if (!deletedRestaurant) {
            return {
                deleted: false,
                message: 'Already deleted or does not exist',
            };
        }

        return {
            deleted: true,
            message: 'Restaurant deleted successfully',
        };

    }
}
