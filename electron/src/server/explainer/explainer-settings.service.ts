import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ExplainerSettings, Prisma } from '@prisma/client';
import { ExplainerSettingsDto } from './explainer-settings.dto';

@Injectable()
export class ExplainerSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(): Promise<ExplainerSettings> {
    // Get first record or create default if none exists
    let settings = await this.prisma.explainerSettings.findFirst();
    
    if (!settings) {
      settings = await this.prisma.explainerSettings.create({
        data: {
          leftClickBehavior: 'main_window',
        },
      });
    }
    
    return settings;
  }

  async updateSettings(data: ExplainerSettingsDto): Promise<ExplainerSettings> {
    let settings = await this.getSettings();
    
    return this.prisma.explainerSettings.update({
      where: { id: settings.id },
      data: {
        customPrompt: data.customPrompt !== undefined ? data.customPrompt : settings.customPrompt,
        apiKey: data.apiKey !== undefined ? data.apiKey : settings.apiKey,
        leftClickBehavior: data.leftClickBehavior !== undefined ? data.leftClickBehavior : settings.leftClickBehavior,
      }
    });
  }
}