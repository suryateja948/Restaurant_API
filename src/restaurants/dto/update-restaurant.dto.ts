import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString } from "class-validator";
import { Category } from "../schemas/restaurant.schema"

export class UpdateRestaurantDto {

    @IsOptional()
    @IsString()
    readonly name?: string;

    @IsOptional()
    @IsString()
    readonly description?: string;

    @IsOptional()
    @IsEmail({}, { message: 'Please enter a valid email address' })
    readonly email?: string;

    @IsOptional()
    @IsPhoneNumber('IN', { message: 'Please enter a valid PhoneNumber' })
    readonly phoneNo?: Number;

    @IsOptional()
    @IsString()
    readonly address?: string;

    @IsOptional()
    @IsEnum(Category, { message: 'Please enter correct category !!' })
    readonly category?: Category;

}