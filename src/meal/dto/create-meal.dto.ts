import { User } from '../../schemas/user.schema';
import { Category_meals } from "../schemas/meal.schema"
import { IsEmpty, IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator"

export class CreateMealDto {

    @IsNotEmpty()
    @IsString()
    readonly name: string

    @IsNotEmpty()
    @IsString()
    readonly description: string

    @IsNotEmpty()
    @IsNumber()
    readonly price: number

    @IsNotEmpty()
    @IsEnum(Category_meals, { message: 'Please enter correct category for this meal' })
    readonly category: Category_meals

    @IsNotEmpty()
    @IsString()
    readonly restaurant: string //Here we need to pass Restaurant Id as a string 


    @IsEmpty({ message: 'You cannot provide a User ID.' })
    readonly user?: User


}



