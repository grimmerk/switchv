import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { XWinService } from './xwins/xwins.service';
import { PrismaService } from './prisma.service';

import { XWinsController } from './xwins/xwins.controller';

@Module({
  imports: [],
  controllers: [AppController, XWinsController],
  providers: [AppService, PrismaService, XWinService],
})
export class AppModule {}
