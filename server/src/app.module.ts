import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { XwinsController } from './xwins/xwins.controller';

@Module({
  imports: [],
  controllers: [AppController, XwinsController],
  providers: [AppService],
})
export class AppModule {}
