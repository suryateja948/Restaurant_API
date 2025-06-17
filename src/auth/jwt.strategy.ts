import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
//import { User } from 'src/schemas/user.schema';
import {User} from '../schemas/user.schema'
import { Model } from 'mongoose';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectModel(User.name)
        private userModel: Model<User>
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 👈 Take JWT from Authorization header
            //ignoreExpiration: false, // 👈 Reject expired tokens
            secretOrKey: process.env.JWT_SECRET, // 👈 Secret key to verify the token
        });
    }

    async validate(payload: any) {
        const user = await this.userModel.findById(payload.sub); // sub contains the user._id

        if (!user) {
            throw new UnauthorizedException('Login first to access this resource');
        }

        return user;
    }

}
