import { Controller, Get, Post, Res, HttpStatus, Body } from '@nestjs/common';
import { Response } from 'express';

import { CreateXwinDto } from './xwin.dto';

@Controller('xwins')
export class XwinsController {
  @Post()
  async create(@Body() createCatDto: CreateXwinDto, @Res() res: Response) {
    res.status(HttpStatus.CREATED).send();
  }
}
