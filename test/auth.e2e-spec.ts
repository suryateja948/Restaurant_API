import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import * as mongoose from 'mongoose';
import { UserRoles } from 'src/schemas/user.schema';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeAll(() => {
    const dbUri = process.env.DB_URI_LOCAL;
    if (!dbUri) {
      throw new Error('DB_URI_LOCAL environment variable is not set');
    }
    mongoose.connect(dbUri).then(() => {
      if (mongoose.connection.db) {
        mongoose.connection.db.dropDatabase();
      }
    });
  });

  afterAll(() => mongoose.disconnect());

  const user = {
    name: 'Surya Teja',
    email: 'surya@gmail.com',
    password: '12345678',
    role: UserRoles.USER, // or 'Admin' based on your requirements
  };

  it('(POST) - register a new user', () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send(user)
      .expect(201)
      .then((res) => {
        //expect(res.body.token).toBeDefined();
        expect(res.body.name).toBe(user.name);
        expect(res.body.email).toBe(user.email);
        expect(res.body.role).toBe(user.role);  
        expect(res.body._id).toBeDefined();
        expect(res.body.password).toBeUndefined(); // Password should not be returned
      });
  });

  it('(POST) - login user', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(201)
      .then((res) => {
        expect(res.body.token).toBeDefined();
      });
  });
});