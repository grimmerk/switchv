import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { XWinService } from './xwins/xwins.service';
import { XWinsController } from './xwins/xwins.controller';

import { UserService } from './user/user.service';
import { UserController } from './user/user.controller';

@Module({
  imports: [],
  controllers: [AppController, XWinsController, UserController],
  providers: [AppService, PrismaService, XWinService, UserService],
})
export class AppModule {}
