import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as mongoose from "mongoose";
import { Document } from 'mongoose';
import { Restaurant } from "../../restaurants/schemas/restaurant.schema";
import { User } from "../../schemas/user.schema";

export enum Category_meals {
    SOUPS = 'Soups',
    SALADS = 'Salads',
    SANDWICHES = 'Sandwiches',
    PASTA = 'Pasta',
    MAIN_COURSE = 'Main Course', // Added more typical categories
    DESSERTS = 'Desserts',
    BEVERAGES = 'Beverages',
}

@Schema(
    {
        timestamps: true, //This will automatically current date and time when we create a new meal
    }
)
export class Meal extends Document {
    @Prop()
    name: string;

    @Prop()
    description: string;

    @Prop()
    price: number;

    @Prop({ type: String, enum: Category_meals }) // Ensure this is stored as a string
    category: Category_meals;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' })
    restaurant: Restaurant; // This indicates which restaurant the document is related to.

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    user: mongoose.Types.ObjectId | User; // allow ObjectId or full User document

}

export const MealSchema = SchemaFactory.createForClass(Meal);
