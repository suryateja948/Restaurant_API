import { Transform } from "class-transformer"
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator"

export class LoginDto {

    @IsNotEmpty()
    @Transform(({ value }) => value.trim().toLowerCase())
    @IsEmail({}, {message : 'Please enter correct email address'})
    readonly email: string 


    @IsNotEmpty()
    @IsString()
     @Transform(({ value }) => value.trim())
    @MinLength(8, {message: "Password must be atleast 8 characters"})
    readonly password: string 
}