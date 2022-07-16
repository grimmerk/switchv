import { Controller, Get, Post, Res, HttpStatus, Body } from '@nestjs/common';
import { Response } from 'express';

import { CreateXwinDto } from './xwin.dto';

const tmpWinList: CreateXwinDto[] = [];

/** TODO: use prisma DB client + sqlite/MongoDB instead */
/** DB part */
const addXWinToInMemoryDB = (dto: CreateXwinDto) => {
  tmpWinList.push(dto);
};

const getXWinFromInMemoryDB = () => {
  if (!tmpWinList.length) {
    // dummy data
    return [
      {
        paths: ['/Users/grimmer/git/algorithms-vscode'],
        workspace_path: '',
      },
    ];
  }

  return tmpWinList;
};
/** DB part */

@Controller('xwins')
export class XwinsController {
  /**
   *
   * @param createCatDto
   *  case1: workspace
   *   paths:[] may be more than 1 element
   *   workspace_path: '/Users/grimmer/space/auth.code-workspace' (not empty)
   *  case2: normal project folder
   *   workspace_path: '' (empty string)
   * @param res
   */

  @Post()
  async create(@Body() createCatDto: CreateXwinDto, @Res() res: Response) {
    addXWinToInMemoryDB(createCatDto);
    res.status(HttpStatus.CREATED).send();
  }

  @Get()
  async findAll(): Promise<CreateXwinDto[]> {
    return getXWinFromInMemoryDB();
  }
}
