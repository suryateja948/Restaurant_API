import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module'; // Adjusted path for clarity

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Use validation pipe as in main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  // This is crucial for closing connections!
  afterAll(async () => {
    await app.close();
  });

  const testUser = {
  email: 'testuser.app@gmail.com',
  password: 'password123',
};

  const loginUrl = '/auth/login'; // To Avoid Repetition we are using a constant for the login URL

  const UserUrl = '/auth/users'; // To Avoid Repetition we are using a constant for the User URL

  const signupUrl = '/auth/signup'; // To Avoid Repetition we are using a constant for the signup URL

  it('1. Should return 400 if email is empty', async () => {
    await request(app.getHttpServer())
      .post(loginUrl)
      .send({ email: '', password: 'Password123' })
      .expect(400);
  });

  it('2. Should return 400 if password is empty', async () => {
    await request(app.getHttpServer())
      .post(loginUrl)
      .send({ email: 'test@example.com', password: '' })
      .expect(400);
  });

  it('3. Should return 400 if password is less than 8 characters', async () => {
    await request(app.getHttpServer())
      .post(loginUrl)
      .send({ email: 'test@example.com', password: '12345' })
      .expect(400);
  });

  it('4. Should return 400 for invalid email format', async () => {
    await request(app.getHttpServer())
      .post(loginUrl)
      .send({ email: 'not-an-email', password: 'ValidPass123' })
      .expect(400);
  });

  it('5. Should return 400 if only email is provided', async () => {
    await request(app.getHttpServer())
      .post(loginUrl)
      .send({ email: 'test@example.com' })
      .expect(400);
  });

  it('6. Should return 400 if only password is provided', async () => {
    await request(app.getHttpServer())
      .post(loginUrl)
      .send({ password: 'Password123' })
      .expect(400);
  });
  // it('7. Should return 200 when accessing protected route with valid token', async () => {
  //   const loginRes = await request(app.getHttpServer())
  //     .post(loginUrl)
  //     .send({ email: 'admin@gmail.com', password: 'admin@123' });
  //   const token = loginRes.body.token;
  //   await request(app.getHttpServer())
  //     .get(UserUrl)
  //     .set('Authorization', `Bearer ${token}`)
  //     .expect(200);
  // });

  it('7. Should return 200 when accessing protected route with valid token', async () => {
    // Step 1: Create the user first. This makes the test self-contained.
    await request(app.getHttpServer())
      .post(signupUrl)
      .send({
        name: 'Testing User',
        email: testUser.email,
        password: testUser.password,
      })
      .expect(201); // Make sure signup is successful

    // Step 2: Log in with the user you just created.
    const loginRes = await request(app.getHttpServer())
      .post(loginUrl)
      .send(testUser); // Use the same credentials

    const token = loginRes.body.token;
    
    // Defensive check: Ensure a token was actually returned.
    // If login failed, token would be undefined, causing a 401.
    expect(token).toBeDefined();

    // Step 3: Use the valid token to access the protected route.
    await request(app.getHttpServer())
      .get(UserUrl)
      .set('Authorization', `Bearer ${token}`)
      .expect(200); // This will now pass
  });

  it('8. Should return 401 when accessing protected route without token', async () => {
    await request(app.getHttpServer())
      .get('/auth/users')
      .expect(401);
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello , This is a nest.js project using mongodb and writing the unit test cases by Jest Testing Framework!');
  });
});