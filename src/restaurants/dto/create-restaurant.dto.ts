import { IsEmail, IsEnum, IsNotEmpty, IsPhoneNumber, IsString } from "class-validator";
import { Category } from "../schemas/restaurant.schema"

export class CreateRestaurantDto {

    @IsString()
    @IsNotEmpty()
    readonly name: string;

    @IsString()
    @IsNotEmpty()
    readonly description: string;

    @IsEmail({}, { message: 'Please enter a valid email address' })
    @IsNotEmpty()
    readonly email: string;

    @IsPhoneNumber('IN', { message: 'Please enter a valid PhoneNumber' })
    @IsNotEmpty()
    readonly phoneNo: Number;

    @IsString()
    @IsNotEmpty()
    readonly address: string;

    @IsEnum(Category, { message: 'Please enter correct category !!' })      // The value of the category must be enum from the list of category in schema
    @IsNotEmpty()
    readonly category: Category;
}