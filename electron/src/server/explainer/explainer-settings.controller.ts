import { Controller, Get, Post, Body } from '@nestjs/common';
import { ExplainerSettingsService } from './explainer-settings.service';
import { ExplainerSettingsDto, ExplainerSettingsResponseDto } from './explainer-settings.dto';
import { ExplainerSettings } from '@prisma/client';

@Controller('explainer-settings')
export class ExplainerSettingsController {
  constructor(private readonly explainerSettingsService: ExplainerSettingsService) {}

  @Get()
  async getSettings(): Promise<ExplainerSettings> {
    return this.explainerSettingsService.getSettings();
  }

  @Post()
  async updateSettings(@Body() data: ExplainerSettingsDto): Promise<ExplainerSettings> {
    return this.explainerSettingsService.updateSettings(data);
  }
}