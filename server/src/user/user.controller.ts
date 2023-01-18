import { Controller, Get, Post, Body } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async update(@Body() userInput: Prisma.UserCreateInput): Promise<string> {
    await this.userService.updateUser(userInput);
    return 'ok';
  }

  @Get()
  async read(): Promise<User> {
    const data = await this.userService.getUser();

    return data ?? { id: 1, workingFolder: '' };
  }
}
