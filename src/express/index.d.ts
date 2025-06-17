import { User } from 'src/schemas/user.schema';

declare module 'express' {
  interface Request {
    user: User;
  }
}
