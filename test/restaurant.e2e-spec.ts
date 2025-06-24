import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as mongoose from 'mongoose';
import { loadEnvFile } from '../src/config/load-env';
import { Category } from '../src/restaurants/schemas/restaurant.schema';
loadEnvFile();

let adminToken: string;
let userToken: string;
let createdRestaurantId: string;

describe('RestaurantsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // BEST PRACTICE: Enable transformation in the validation pipe
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    const dbUri = process.env.DB_URI_LOCAL;
    if (!dbUri) throw new Error('DB_URI_LOCAL not set');
    await mongoose.connect(dbUri);
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    } else {
      throw new Error('Database connection is not established.');
    }
     console.log('DB_URI_LOCAL:', dbUri);
    console.log('Connected to MongoDB for testing');
  
    // ... (rest of the user creation and login logic is fine)
    // Register Admin
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ name: 'Admin', email: 'admin@test.com', password: '12345678', role: 'admin' });

    // Register User
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ name: 'User', email: 'user@test.com', password: '12345678', role: 'user' });

    // Login Admin
    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: '12345678' });
    adminToken = adminRes.body.token;

    // Login User
    const userRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: '12345678' });
    userToken = userRes.body.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await app.close();
  });

  it('POST /restaurants (Admin) - should create restaurant with any category', async () => {
    const res = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Fine Feast',
        address: 'Downtown',
        category: Category.FINE_DINING,
        description: 'A fine dining experience',
        email: 'finefeast@test.com',
        // LIKELY FIX: Send phone number as a string to pass @IsPhoneNumber validation
        phoneNo: "9912356789", 
      })
      .expect(201);

    createdRestaurantId = res.body._id;

    expect(res.body.name).toBe('Fine Feast');
    expect(res.body.category).toBe(Category.FINE_DINING);
    expect(createdRestaurantId).toBeDefined();
  });

  it('POST /restaurants (User) - should create own restaurant with different category', async () => {
    const res = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'User Cafe',
        address: 'Uptown',
        category: Category.CAFE,
        description: 'A cozy cafe',
        email: 'usercafe@test.com',
        // LIKELY FIX: Send phone number as a string
        phoneNo: "9901234567",
      })
      .expect(201);

    expect(res.body.name).toBe('User Cafe');
    expect(res.body.category).toBe(Category.CAFE);
  });

  it('POST/restaurants (User) - Should create own restaurant and category fine dining as well', async () => {
    const res = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'User Fine Dining',
        address: '123 User Fine St',
        category: Category.FINE_DINING,
        description: 'A user-owned fine dining restaurant',
        email: 'user_fine_dining@test.com',
        phoneNo: "9912345678",
      })
      .expect(201);

    expect(res.body.name).toBe('User Fine Dining');
    expect(res.body.category).toBe(Category.FINE_DINING);
  });



  // The rest of the tests should now pass as data will be created correctly.
  it('GET /restaurants - Admin sees all', async () => {
    const res = await request(app.getHttpServer())
      .get('/restaurants')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /restaurants - User sees Fine Dining and own restaurant', async () => {
    const res = await request(app.getHttpServer())
      .get('/restaurants')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.find((r) => r.category === Category.FINE_DINING)).toBeDefined();
    expect(res.body.find((r) => r.name === 'User Cafe')).toBeDefined();
  });

  it('GET/restaurants - User should see the fine dining restaurant created for this test', async () => {
    // ARRANGE: Create the specific restaurant for this test.
    // (Because of afterEach, the database is empty before this step)
    await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'My Test Fine Dining', // Use a unique name
        address: '123 Specific St',
        category: Category.FINE_DINING,
        description: 'A restaurant for a specific test',
        email: 'specific@test.com',
        phoneNo: "9912345678",
      });
  
    // ACT: Get the list of all restaurants.
    const res = await request(app.getHttpServer())
      .get('/restaurants')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
  
    // ASSERT: Find the restaurant by its UNIQUE NAME, not its general category.
    const fineDiningRestaurant = res.body.find((r) => r.name === 'My Test Fine Dining');
  
    // Now these assertions will pass reliably.
    expect(fineDiningRestaurant).toBeDefined();
    expect(fineDiningRestaurant.category).toBe(Category.FINE_DINING);
});

  it('GET /restaurants/:id - should fetch by ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/restaurants/${createdRestaurantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body._id).toBe(createdRestaurantId);
  });

  it('PUT /restaurants/:id - Admin can update any restaurant', async () => {
    const res = await request(app.getHttpServer())
      .put(`/restaurants/${createdRestaurantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated Feast',
      })
      .expect(200);

    expect(res.body.name).toBe('Updated Feast');
  });
 // Delete the restaurant created by the admin 

  it('DELETE /restaurants/:id - Admin can delete', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/restaurants/${createdRestaurantId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Assuming your endpoint returns { deleted: true } or similar
    expect(res.body.deleted).toBe(true);
  });

it('DELETE/restaurants/:id - User can delete THEIR OWN restaurant', async () => {
    // STEP 1: Create a restaurant that this user will own.
    const createRes = await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${userToken}`) // Use the user's token
        .send({
            name: 'Restaurant To Be Deleted',
            address: '123 Delete St',
            category: Category.CAFE, // Category doesn't matter for this test
            description: 'A temporary restaurant',
            email: 'delete@test.com',
            phoneNo: "9912345678", // Send phone number as a string
        });

    const userOwnedRestaurantId = createRes.body._id; // Get the ID of the restaurant they just created.

    // STEP 2: Now, delete the restaurant they just created.
    const deleteRes = await request(app.getHttpServer())
        .delete(`/restaurants/${userOwnedRestaurantId}`) // Use the correct ID
        .set('Authorization', `Bearer ${userToken}`)    // Use the same user's token
        .expect(200); // This will now pass
        console.log('Delete Response:', deleteRes.body);
    expect(deleteRes.body.deleted).toBe(true);
});

// The title of the test should reflect what you are testing for: SUCCESS
it('DELETE/restaurants/:id - User SHOULD be able to delete an Admin-owned Fine Dining restaurant', async () => {
    // STEP 1: Admin creates a Fine Dining restaurant. This part is correct.
    const createRes = await request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${adminToken}`) // Use the admin's token
        .send({
            name: 'Special Fine Dining',
            address: '123 Exception Ave',
            category: Category.FINE_DINING,
            description: 'A test case restaurant',
            email: 'special@test.com',
            phoneNo: "9912345679",
        });

    const fineDiningRestaurantId = createRes.body._id;

    // STEP 2: The user attempts the deletion.
    const deleteRes = await request(app.getHttpServer())
        .delete(`/restaurants/${fineDiningRestaurantId}`)
        .set('Authorization', `Bearer ${userToken}`); // User's token
    
    // --- FIXES ARE HERE ---

    // FIX #1: Expect a SUCCESS status code, not a failure.
    expect(deleteRes.status).toBe(200);

    // FIX #2: Expect the success response body from your controller.
    expect(deleteRes.body.deleted).toBe(true);
    expect(deleteRes.body.message).toBe('Restaurant deleted successfully');
});
    it('DELETE/restaurants/:id - User should be able to delete their own restaurant as well as Fine Dining restaurants', async () => {
    // STEP 1: Create a Fine Dining restaurant as the user.
    const createRes = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'User Fine Dining',
        address: '123 User Fine St',
        category: Category.FINE_DINING,
        description: 'A user-owned fine dining restaurant',
        email: 'user_fine_dining@test.com',
        phoneNo: "9912345678",
      });

    const userFineDiningRestaurantId = createRes.body._id;

    // STEP 2: Now, delete the restaurant they just created.
    const deleteRes = await request(app.getHttpServer())
      .delete(`/restaurants/${userFineDiningRestaurantId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(deleteRes.body.deleted).toBe(true);
    expect(deleteRes.body.message).toBe('Restaurant deleted successfully');
});


});
