import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document, Types } from "mongoose";
import { User } from "../../schemas/user.schema";

export enum Category {
    FAST_FOOD = 'Fast Food',
    CAFE = 'Cafe',
    FINE_DINING = 'Fine Dining'
}
@Schema(
    {
        timestamps: true, //This will automatically current date and time when we create a new restaurant
    }
)
export class Restaurant extends Document {

    declare _id: Types.ObjectId; // I am declaring that this _id field exists, and its type is Types.ObjectId (from Mongoose). But I’m not assigning any value right now.

    @Prop()
    name: string

    @Prop()
    description: string

    @Prop()
    email: string

    @Prop()
    phoneNo: Number

    @Prop()
    address: string

    @Prop()
    category: Category // Enum 

    @Prop()
    images?: object[] //Array of object 


    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    user: mongoose.Types.ObjectId | User; // References the creator of the document, storing either the user's ObjectId or the full User object when populated.

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    updatedBy: mongoose.Types.ObjectId | User; // References the last user who updated the document, storing their ObjectId or populated User object.

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meal' }] }) // This means a restaurant can optionally have a list of associated meals, each stored by their ObjectId and referencing the Meal collection.
    meals?: Types.ObjectId[];
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);