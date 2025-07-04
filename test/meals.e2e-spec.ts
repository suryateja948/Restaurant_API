// test/meals.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as mongoose from 'mongoose';
import { loadEnvFile } from '../src/config/load-env';
// Corrected: Use the right enum for restaurant categories.
import { Category } from '../src/restaurants/schemas/restaurant.schema';
import { Category_meals, Meal } from '../src/meal/schemas/meal.schema';
import { getModelToken } from '@nestjs/mongoose';

loadEnvFile();

let app: INestApplication;
let adminToken: string;
let userToken: string;
let adminRestaurantId: string;
let userFineDiningRestaurantId: string;
let userNonFineRestaurantId: string;
let createdMealId: string;
let adminMealId: string;
let mealModel: mongoose.Model<Meal>;

// Assuming these values exist in your Category enum in `restaurant.schema.ts`
enum AssumedRestaurantCategory {
    CAFE = 'Cafe',
    FINE_DINING = 'Fine Dining',
    FAST_FOOD = 'Fast Food',
}

describe('MealController (e2e)', () => {
    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true }));

       
        await app.init();

        const dbUri = process.env.DB_URI_LOCAL;
        if (!dbUri) throw new Error('DB_URI_LOCAL not set');
        await mongoose.connect(dbUri);
        if (mongoose.connection.db) {
            await mongoose.connection.db.dropDatabase();
        }

        // Register Admin & User
        await request(app.getHttpServer()).post('/auth/signup').send({
            name: 'Admin', email: 'admin@test.com', password: '12345678', role: 'admin',
        });
        await request(app.getHttpServer()).post('/auth/signup').send({
            name: 'User', email: 'user@test.com', password: '12345678', role: 'user',
        });

        // Login Admin
        const adminRes = await request(app.getHttpServer()).post('/auth/login').send({
            email: 'admin@test.com', password: '12345678',
        });
        adminToken = adminRes.body.token;

        // Login User
        const userRes = await request(app.getHttpServer()).post('/auth/login').send({
            email: 'user@test.com', password: '12345678',
        });
        userToken = userRes.body.token;

        // Admin creates a non-Fine Dining restaurant
        const adminRestaurant = await request(app.getHttpServer())
            .post('/restaurants')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Admin Non-Fine',
                address: 'Admin Addr',
                // FIX: Use the correct enum for the restaurant's category
                category: AssumedRestaurantCategory.CAFE,
                description: 'Admin owned cafe',
                email: 'admin_cafe@test.com',
                phoneNo: "9912345678",
            });
        adminRestaurantId = adminRestaurant.body._id;

        // User creates Fine Dining and Non-Fine Dining restaurants
        const userFine = await request(app.getHttpServer())
            .post('/restaurants')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                name: 'User Fine',
                address: 'User Addr',
                // FIX: Use the correct enum for the restaurant's category
                category: AssumedRestaurantCategory.FINE_DINING,
                description: 'User owned fine dining',
                email: 'user_fine@test.com',
                phoneNo: "9912345678",
            });
        userFineDiningRestaurantId = userFine.body._id;

        const userNonFine = await request(app.getHttpServer())
            .post('/restaurants')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                name: 'User Cafe',
                address: 'User Addr 2',
                // FIX: Use the correct enum for the restaurant's category
                category: AssumedRestaurantCategory.CAFE,
                description: 'User owned cafe',
                email: 'user_cafe@test.com',
                phoneNo: "9912345679",
            });
        userNonFineRestaurantId = userNonFine.body._id;
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await app.close();
    });

    it('should allow admin to create a meal', async () => {
        const res = await request(app.getHttpServer())
            .post('/meals')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'admin meal',
                description: 'admin meal desc',
                price: 300,
                // FIX: Added the missing 'category' field
                category: Category_meals.DESSERTS,
                restaurant: adminRestaurantId,
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('meals');
        // This line assumes the POST response contains a list of all meals for the restaurant.
        adminMealId = res.body.meals.find((m) => m.name === 'admin meal')._id;
        expect(adminMealId).toBeDefined();
    });

    it('should allow user to create a meal for their Fine Dining restaurant', async () => {
        const res = await request(app.getHttpServer())
            .post('/meals')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                name: 'fine meal',
                description: 'fine meal desc',
                price: 250,
                // FIX: Added the missing 'category' field
                category: Category_meals.SALADS,
                restaurant: userFineDiningRestaurantId,
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('meals');
        const created = res.body.meals.find((m) => m.name === 'fine meal');
        expect(created).toBeDefined();
        createdMealId = created._id;
    });

    it('should create a meal for own restaurant but for different category', async () => {
        const res = await request(app.getHttpServer())
            .post('/meals')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                name: 'different category meal',
                description: 'desc',
                price: 200,
                // FIX: Added the missing 'category' field
                category: Category_meals.PASTA,
                restaurant: userFineDiningRestaurantId,
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('meals');
        const created = res.body.meals.find((m) => m.name === 'different category meal');
        expect(created).toBeDefined();
        createdMealId = created._id;
    });

    it('should allow a USER to create a meal in ANY Fine Dining restaurant, even one owned by an ADMIN', async () => {
        // --- SETUP: First, the ADMIN creates a Fine Dining restaurant ---
        const fineDiningRes = await request(app.getHttpServer())
            .post('/restaurants')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Admins Fine Bistro',
                address: '1 Admin Way',
                category: Category.FINE_DINING, // This is the key part
                description: 'A fine dining spot open for suggestions',
                email: 'bistro@test.com',
                phoneNo: "9988776655",
            });

        expect(fineDiningRes.status).toBe(201);
        const adminFineDiningRestaurantId = fineDiningRes.body._id;

        // --- ACTION & ASSERTION: Now, the USER creates a meal in that Fine Dining restaurant ---
        const mealRes = await request(app.getHttpServer())
            .post('/meals')
            .set('Authorization', `Bearer ${userToken}`) // Logged in as USER
            .send({
                name: 'User Suggested Salad',
                description: 'A new salad for the menu',
                price: 350,
                category: Category_meals.SALADS,
                restaurant: adminFineDiningRestaurantId, // The ID of the Fine Dining restaurant
            });

        // According to your logic, this should be allowed and should return 201.
        expect(mealRes.status).toBe(201);
        expect(mealRes.body.meals.some(m => m.name === 'user suggested salad')).toBe(true);
    });

     it('should not allow user to create meal in Admin’s non-Fine Dining restaurant', async () => {
        const res = await request(app.getHttpServer())
            .post('/meals')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                name: 'invalid meal',
                description: 'desc',
                price: 200,
                // FIX: Added the missing 'category' field
                category: Category_meals.DESSERTS,
                restaurant: adminRestaurantId,
            });

        // Now that the payload is valid, the request will be processed and should be rejected by the authorization logic.
        expect(res.status).toBe(403);
    });

    it('should fetch all meals for admin', async () => {
        const res = await request(app.getHttpServer())
            .get('/meals')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.role).toBe('admin');
        expect(res.body.meals.length).toBeGreaterThan(0);
    });

    it('should fetch all meals for user', async () => {
        const res = await request(app.getHttpServer())
            .get('/meals')
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.role).toBe('user');
        expect(res.body.meals.length).toBeGreaterThan(0);
    });


    it('should get all meals for a restaurant, excluding the fine dining category', async () => {
        const res = await request(app.getHttpServer())
            // Add the query parameter to the URL
            .get(`/meals/restaurant/${userNonFineRestaurantId}?excludeCategory=FINE_DINING`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.every(m => m.category !== 'FINE_DINING')).toBe(true);
    });

    it('GET /meals - User should see meals from Fine Dining restaurant created by Admin', async () => {
        // Register and login user
        await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                name: 'User',
                email: 'user@test.com',
                password: '12345678',
            });

        const userLoginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'user@test.com', password: '12345678' });
        console.log('User Login Response:', userLoginRes.body, userLoginRes.status);
        const userToken = userLoginRes.body.token;
        expect(userToken).toBeDefined();

        const res = await request(app.getHttpServer())
            .get('/meals')
            .set('Authorization', `Bearer ${userToken}`);

        console.log('Fetched Meals:', res.body);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.meals)).toBe(true);

        const fineDiningMeals = res.body.meals.filter(
            (meal) => meal.restaurant?.category === 'Fine Dining'
        );
        expect(fineDiningMeals.length).toBeGreaterThan(0);
    });




    it('should allow user to update their Fine Dining meal', async () => {
        const res = await request(app.getHttpServer())
            .put(`/meals/${createdMealId}/restaurant/${userFineDiningRestaurantId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ price: 350 });

        expect(res.status).toBe(200);
        expect(res.body.price).toBe(350);
    });

    it('should allow Admin to update their meals ', async () => {
        const res = await request(app.getHttpServer())
            .put(`/meals/${adminMealId}/restaurant/${adminRestaurantId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ price: 400 });
        expect(res.status).toBe(200);
        expect(res.body.price).toBe(400);
    });

    it('should allow the user to update their own restaurant even if it is not Fine Dining', async () => {
        const res = await request(app.getHttpServer())
            .put(`/restaurants/${userNonFineRestaurantId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ name: 'Meghana Restaurant', category: 'Fast Food' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Meghana Restaurant');
        expect(res.body.category).toBe('Fast Food');
    });

    it('should allow the user to update the category of the Fine Dining but restaurant is created by the Admin', async () => {
        const res = await request(app.getHttpServer())
            .put(`/restaurants/${userFineDiningRestaurantId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ name: 'Meghana Fine Dining', category: 'Fine Dining' });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Meghana Fine Dining');
        expect(res.body.category).toBe('Fine Dining');
    });

it('should get the meals based on the restaurant ID for the Admin role', async () => {
        const res = await request(app.getHttpServer())
            .get(`/meals/restaurant/${adminRestaurantId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
it('should get the meals based on the restaurant ID for the user role which has owned the restaurant and as well as Fine Dining restaurant', async () => {
        const res = await request(app.getHttpServer())
            .get(`/meals/restaurant/${userFineDiningRestaurantId}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
    it('should get the meals based on the restaurant ID for the user role which has owned the restaurant but different category', async () => {
        const res = await request(app.getHttpServer())
            .get(`/meals/restaurant/${userNonFineRestaurantId}`)
            .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('should get the meals based on the restaurant ID for the Admin role but category should be Fine Dining', async () => {
        const res = await request(app.getHttpServer())
            .get(`/meals/restaurant/${userFineDiningRestaurantId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('should allow user to delete the meal from their own restaurant which has the category Fine Dining', async () => {
        const res = await request(app.getHttpServer())
            .delete(`/meals/${createdMealId}/restaurant/${userFineDiningRestaurantId}`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Meal deleted successfully');
    });

 it('should allow Admin to delete the meal irrespective of the category and restaurant who has created it', async () => {
    const res = await request(app.getHttpServer())
        .delete(`/meals/${adminMealId}/restaurant/${adminRestaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Meal deleted successfully by admin');
});


 


});