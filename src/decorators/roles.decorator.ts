import { SetMetadata } from '@nestjs/common';
import { UserRoles } from 'src/schemas/user.schema';

export const Roles = (...roles: UserRoles[]) => SetMetadata('roles', roles); //Roles decorator tags routes with allowed roles so guards can control access. 
