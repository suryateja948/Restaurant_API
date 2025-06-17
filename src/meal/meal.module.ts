import { Module } from '@nestjs/common';
import { MealController } from 'src/meal/meal.controller';
import { MealService } from 'src/meal/meal.service';
import { MongooseModule } from '@nestjs/mongoose';
import { MealSchema } from './schemas/meal.schema';
import { AuthModule } from 'src/auth/auth.module';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: 'Meal', schema: MealSchema }
    ]),
    RestaurantsModule
  ],

  controllers: [MealController],
  providers: [MealService]
})
export class MealModule { }
