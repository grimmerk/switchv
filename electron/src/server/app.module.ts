import { Module } from '@nestjs/common';
import { AppController, AppEnvController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { XWinsController } from './xwins/xwins.controller';
import { XWinService } from './xwins/xwins.service';
import { ExplainerSettingsController } from './explainer/explainer-settings.controller';
import { ExplainerSettingsService } from './explainer/explainer-settings.service';

@Module({
  imports: [],
  controllers: [
    AppController,
    AppEnvController, 
    XWinsController, 
    UserController,
    ExplainerSettingsController
  ],
  providers: [
    AppService, 
    PrismaService, 
    XWinService, 
    UserService,
    ExplainerSettingsService
  ],
})
export class AppModule {}
