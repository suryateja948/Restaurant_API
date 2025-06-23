import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
//import { User } from 'src/schemas/user.schema';
import {User} from '../schemas/user.schema'
import { SignUpDto } from './dto/signup.dto';


import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService
  ) { }

  async signUp(signUpDto: SignUpDto): Promise<User> {
    const { name, email, password, role } = signUpDto; // these parameters are extracted from the signupdto

    const existingUser = await this.userModel.findOne({ email }); //This snippet basically checks whether the Email is Existed or Not 
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    
 
    const hashedPassword = await bcrypt.hash(password, 10); // basically this snippet is used to hash the password
    const user = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
      // role: role || 'User'    // assigns only if not provided
      role,
    });



    return user; // returns the user object 

  }


  // Login User 

  async login(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;

    // 1. Find user by email
    const user = await this.userModel.findOne({ email }).select('+password');

    if (!user) {
      //throw new NotFoundException('User not found');
      throw new UnauthorizedException('Invalid credentials')
    }

    // 2. Compare entered password with stored hash
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { email: user.email, sub: user._id , role: user.role}; // Payload it takes (USER_ID , Email, role )

    const token = await this.jwtService.signAsync(payload); // SignAsync() - Creates a jwt token 

    // 3. Return response if login is successful
    return {
      message: 'Login successful',
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role // Optional based on the response whether the user wants the role or not based on that we need to add this line 
        //password: user.password
      },
    };


  }

  //Get All Users 
  async getAllUsers(): Promise<User[]> {
    return this.userModel.find().select('-password').exec(); // exclude password field 
  }
}



