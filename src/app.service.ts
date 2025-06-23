import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello , This is a nest.js project using mongodb and writing the unit test cases by Jest Testing Framework!';
  }
}
