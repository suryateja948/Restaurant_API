import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Category, Restaurant } from './schemas/restaurant.schema';
import * as mongoose from 'mongoose';
import { Query } from 'express-serve-static-core'; // Import Query from express
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
    constructor(
        @InjectModel(Restaurant.name)
        private restaurantModel: mongoose.Model<Restaurant>
    ) { }

    // Helper to build common query options (pagination, keyword)
    // THIS METHOD NEEDS TO BE INSIDE THE CLASS
    private buildQueryOptions(query: Query) {
        const resPerPage = Number(query.limit) || 10; // Allow client to specify limit, default to 10
        const currentPage = Number(query.page) || 1;
        const skip = resPerPage * (currentPage - 1);

        const keyword = query.keyword
            ? {
                name: {
                    $regex: query.keyword,
                    $options: 'i', // Case-insensitive search
                },
            }
            : {};

        return { keyword, resPerPage, skip };
    }

    // Get all Restaurants => GET /restaurants
    // Updated to use the buildQueryOptions helper
    async findAll(query: Query): Promise<Restaurant[]> {
        const { keyword, resPerPage, skip } = this.buildQueryOptions(query); // Use the helper here

        const restaurants = await this.restaurantModel.find({ ...keyword })
            .limit(resPerPage)
            .skip(skip)
            .populate('user', 'email role')
            .populate('updatedBy', '_id email role')
            .populate('meals', 'name description price category user');
        return restaurants;
    }

    // Create a new Restaurant  => POST /restaurants
    async create(restaurant: CreateRestaurantDto, userId: string): Promise<Restaurant> {
        const createdRestaurant = new this.restaurantModel({
            ...restaurant,
            user: userId // store ObjectId (already a string)
        });
        return (await createdRestaurant.save()).populate('user', 'email role');
    }

    // This method is not used in the controller, but keeping it if you use it elsewhere
    async findAllWithUser(): Promise<Restaurant[]> {
        return this.restaurantModel.find()
            .populate('user', 'email role')
            .populate('updatedBy', '_id email role')
            .populate('meals');
    }

    //Get a Restaurant by ID => GET /restaurants/:id
    async findById(id: string): Promise<Restaurant> {
        const isValidId = mongoose.isValidObjectId(id);

        if (!isValidId) {
            throw new BadRequestException(
                'Invalid Mongoose ID. Please enter a correct ID.'
            );
        }
        const restaurant = await this.restaurantModel.findById(id)
            .populate('user', 'email role') // Added for consistent population
            .populate('updatedBy', '_id email role') // Added for consistent population
            .populate('meals'); // Added for consistent population

        if (!restaurant) {
            throw new NotFoundException('Restaurant Not Found....')
        }
        return restaurant;
    }

    //Update a restaurant by ID => PUT/restaurants/:id
    async updateById(id: string, restaurant: UpdateRestaurantDto, userId: string): Promise<Restaurant> {
        const updated = await this.restaurantModel.findByIdAndUpdate(
            id,
            {
                ...restaurant,
                updatedBy: userId, // Set the user who updated it
            },
            {
                new: true,
                runValidators: true
            }
        ).populate('updatedBy', '_id email role')
            .populate('meals')
            .populate('user', 'email role'); // Populate creator on update response as well

        if (!updated) {
            // Use NotFoundException for consistency
            throw new NotFoundException('Restaurant not found');
        }

        return updated;
    }

    //Delete a restaurant by ID => DELETE /restaurants/:id
    async deleteById(id: string): Promise<Restaurant | null> {
        const isValidId = mongoose.isValidObjectId(id); // Added for consistency
        if (!isValidId) {
            throw new BadRequestException('Invalid Mongoose ID. Please enter a correct ID.');
        }
        return await this.restaurantModel.findByIdAndDelete(id);
    }



    async findFineDiningOrOwned(query: Query, userId: string): Promise<Restaurant[]> {
        const { keyword, resPerPage, skip } = this.buildQueryOptions(query);

        const fineDiningQuery: any = { category: Category.FINE_DINING };
        const userOwnedQuery: any = { user: userId };

        if (keyword?.name) {
            fineDiningQuery.name = keyword.name;
            userOwnedQuery.name = keyword.name;
        }

        const restaurants = await this.restaurantModel.find({
            $or: [fineDiningQuery, userOwnedQuery]
        })
            .limit(resPerPage)
            .skip(skip)
            .populate('user', 'email role')
            .populate('updatedBy', '_id email role')
            .populate('meals');

        return restaurants;
    }
}
