import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { XWinsController } from './xwins/xwins.controller';
import { XWinService } from './xwins/xwins.service';

@Module({
  imports: [],
  controllers: [AppController, XWinsController, UserController],
  providers: [AppService, PrismaService, XWinService, UserService],
})
export class AppModule {}
