import { Controller, Get, Post, Res, HttpStatus, Body } from '@nestjs/common';
import { Response } from 'express';

import { VSWindow as VSWindowModel } from '@prisma/client';

import { XWinService } from './xwins.service';

import { CreateXwinDto } from './xwin.dto';

// const tmpWinList: CreateXwinDto[] = [];
/** x TODO: use prisma DB client + sqlite/MongoDB instead */
/** DB part */
// const addXWinToInMemoryDB = (dto: CreateXwinDto) => {
//   tmpWinList.push(dto);
// };
// const getXWinFromInMemoryDB = () => {
//   if (!tmpWinList.length) {
//     // dummy data
//     return [
//       {
//         paths: ['/Users/grimmer/git/algorithms-vscode'],
//         workspace_path: '',
//       },
//     ];
//   }

//   return tmpWinList;
// };
/** DB part */

@Controller('xwins')
export class XWinsController {
  constructor(private readonly xwinService: XWinService) {}

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

  //@Body() userData: { name?: string; email: string },
  @Post()
  async create(@Body() createCatDto: CreateXwinDto): Promise<VSWindowModel> {
    // addXWinToInMemoryDB(createCatDto);

    console.log('post VSCode win', createCatDto);

    const { paths, workspace_path } = createCatDto;
    if (!paths.length) {
      console.log('no paths, return directly');
      return;
    }

    let path = '';
    let isSpace = false;
    let folders = [];
    if (workspace_path) {
      isSpace = true;
      path = workspace_path;
      folders = paths.map((folder: string) => {
        return {
          path: folder,
          inSpace: true,
        };
      });
    } else {
      path = paths[0];
    }

    // https://www.prisma.io/docs/reference/database-reference/database-features
    // https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#defining-a-unique-field
    // @@unique
    const xwin = await this.xwinService.upsertXWin({
      where: { path_inSpace: { path, inSpace: false } },
      update: {
        updatedAt: new Date(),
        embeddedWindows: {
          //set: folders, // not work since it is not to update relations
          // ref: https://github.com/prisma/prisma/issues/5456
          deleteMany: {},
          create: folders,
        },
      },
      create: {
        path,
        isSpace,
        embeddedWindows: {
          // https://stackoverflow.com/questions/68285222/create-or-update-one-to-many-relationship-in-prisma
          // https://stackoverflow.com/questions/65587200/updating-a-many-to-many-relationship-in-prisma
          // connectOrCreate will create if not present and add the categories to the posts as well.
          // connectOrCreat??

          // https://stackoverflow.com/questions/70515366/how-to-update-a-many-to-many-relationship-in-prisma
          // createMany: {
          //   data: [
          //     { boxerId: boxer3.id },
          //   ]
          // },
          // deleteMany: {
          //   OR: [
          //     { boxerId: { equals: boxer1.id } },
          //   ]
          // }
          create: folders,
        },
      },
    });

    return xwin;
  }

  @Get()
  async findAll(): Promise<VSWindowModel[]> {
    console.log('get VSCode win');

    //return getXWinFromInMemoryDB();

    //return this.postService.post({ id: Number(id) });
    const xwins = await this.xwinService.xwins({
      where: { inSpace: false },
      orderBy: {
        updatedAt: 'desc',
      },

      include: { embeddedWindows: true },
      // https://www.prisma.io/docs/concepts/components/prisma-client/pagination
      take: 50,
      // Skip the cursor
      // skip: 2,
      // cursor: {
      //     id: myCursor,
      //   },
    });

    return xwins;
  }
}
