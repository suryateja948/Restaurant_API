import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Category_meals } from '../schemas/meal.schema';

export class UpdateMealDto {
  @IsOptional()
  @IsString()
  readonly name?: string; // Added readonly

  @IsOptional()
  @IsString()
  readonly description?: string; // Added readonly

  @IsOptional()
  @IsNumber()
  readonly price?: number; // Added readonly

  @IsOptional()
  @IsEnum(Category_meals)
  readonly category?: Category_meals; // Added readonly
}
