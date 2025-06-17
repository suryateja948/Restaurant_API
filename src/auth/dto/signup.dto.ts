import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator"
import { UserRoles } from "../../schemas/user.schema";


export class SignUpDto {

    @IsNotEmpty()
    @IsString()
    readonly name: string

    @IsNotEmpty()
    @Transform(({ value }) => value.trim().toLowerCase())
    @IsEmail({}, { message: 'Please enter correct email address' })
    readonly email: string


    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    readonly password: string


    @IsOptional()
    @IsEnum(UserRoles, { message: 'Role must be either Admin or User' })
    role?: UserRoles;
}