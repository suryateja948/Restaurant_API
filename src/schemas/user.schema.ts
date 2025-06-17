import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export enum UserRoles {    // This snippet is basically have User Roles - Admin , User 
    ADMIN = 'admin',
    USER = 'user'
}
@Schema(
    {
        timestamps: true, //This will automatically current date and time when we create a new user
    }
)

export class User extends Document {
    @Prop()
    name: string;

    @Prop({ unique: [true, 'Duplicate email entered'] })
    email: string;

    @Prop({ select: false }) // This defines a password field, but select: false means it will not be returned in queries by default.
    password: string;

    @Prop({
        enum: UserRoles,
        default: UserRoles.USER
    })
    role: UserRoles  // This you are defining like roles is basically UserRoles 
}

export const UserSchema = SchemaFactory.createForClass(User); // This connects your User schema to the MongoDB collection inside NestJS.