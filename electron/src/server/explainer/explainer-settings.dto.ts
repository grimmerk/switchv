import { IsOptional, IsString } from 'class-validator';

export class ExplainerSettingsDto {
  @IsOptional()
  @IsString()
  customPrompt?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  leftClickBehavior?: string;
}

export class ExplainerSettingsResponseDto {
  id: number;
  customPrompt?: string;
  apiKey?: string;
  leftClickBehavior: string;
  createdAt: Date;
  updatedAt: Date;
}