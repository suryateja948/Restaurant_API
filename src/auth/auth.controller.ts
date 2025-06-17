import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { User } from '../schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';



// interface AuthenticatedRequest extends Request {
//     user: any; // You can replace `any` with a proper User type if you have it
// }

@Controller('auth')


export class AuthController {
  constructor(private authService: AuthService) { }



  //Registering a new user 
  @Post('/signup')
  signUp(@Body() signupDto: SignUpDto): Promise<User> {
    return this.authService.signUp(signupDto);
  }


  @Post('/login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/users')
  getAllUsers() {
    return this.authService.getAllUsers();
  }

}
