import { Module } from '@nestjs/common';
import { AIAssistantSettingsController } from './ai-assistant/ai-assistant-settings.controller';
import { AIAssistantSettingsService } from './ai-assistant/ai-assistant-settings.service';
import { AppController, AppEnvController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { XWinsController } from './xwins/xwins.controller';
import { XWinService } from './xwins/xwins.service';

@Module({
  imports: [],
  controllers: [
    AppController,
    AppEnvController,
    XWinsController,
    UserController,
    AIAssistantSettingsController,
  ],
  providers: [
    AppService,
    PrismaService,
    XWinService,
    UserService,
    AIAssistantSettingsService,
  ],
})
export class AppModule {}
