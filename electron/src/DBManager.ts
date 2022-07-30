import { app } from "electron";
import { existsSync } from 'fs';
const path = require('path'); 

// ref:
// https://www.prisma.io/docs/concepts/components/prisma-schema#prisma-schema-file-location schema file path:
// https://github.com/prisma/prisma/issues/8449#issuecomment-887976268 in parcel/pkg
// https://github.com/prisma/prisma/issues/9613 electron
// https://github.com/prisma/prisma/issues/4703#issuecomment-1162417399 programmatic access to CLI 

const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';
const dbFileName = "dev.db";
const appDataPath = app.getPath("userData"); // e.g. '/Users/grimmer/Library/Application Support/Xwin'
const dbUsedVersionTxtPath = `${appDataPath}/dbUsedVersion.txt`
export const sqlitePathInProd = `${appDataPath}/${dbFileName}`

// TODO: use async version later 
import { readFile, writeFile } from 'fs/promises';
import { readFileSync, writeFileSync } from 'fs';
import { fork } from 'child_process';

// ref: 
async function prisma(...args:any[]) {
  console.log(`Running \`prisma ${args.join(' ')}\``)

  // const command = "/usr/local/bin/code /Users/grimmer/git"
  const command = `${DBManager.prismaPath}`
  DBManager.migrateError += `;cmd:${command};`
  console.log({cmd:command})

  // try1: 
  // Uncaught Error: spawn node ENOENT, 
  // 說找不到 build/index.js node not found 之類的
  // const execaCommand = (await import('execa')).execaCommand
  // const command = `${prismaPath} ${args.join(' ')}`  
  // const subprocess = execaCommand(command)
  // subprocess.stdout?.pipe(process.stdout)
  // subprocess.stderr?.pipe(process.stderr)
  // await subprocess

  // try2: not work 
  // const serverProcess = exec(command);

  // TODO: 有時間再確認一下
  // NOTE: 另外遇到的問題
  // electron 的 exec 之前試是認不得 code path, 所以要用 /usr/local/bin/code (之前試是打包版會，沒打包版呢? 沒試) 
  // 但現在打包版 code path 又正常了 ????

  // TODO: 找看看有無方法避免產生
  /** prisma migrate 也會自動產生　typescript file in @prisma/client, 所以 prisma/client 也要安裝 */
  const env = { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin` };

  // NOTE: 
  // 原本的 server process 可以跑 (exec/spawn 時會沒有預設 node path時)? 是因為它已經是 vercel 了

  // https://stackoverflow.com/a/58291475/7354486
  // solution candidates
  // 1. 看是要用 fork (上面 link 提到的可延用 node, 因為 spwan 會沒有預設 node process/path), <- 現在用這方法
  // 2. 或是用vercel/pkg 打包 prisma cli (但要解決 pkg bundle/index.js 缺　package.json 問題)
  // p.s. fork behavior (use node by default): node "/usr/local/bin/code /Users/grimmer/git", 
  // so pass a node.js script path is correct way 
  const child = fork(command, args, { env}); // cwd: TOOLS_DIR, 
}

/** NOTE: only use for packaged app */
export class DBManager {
  static databaseFilePath: string = "";
  static schemaPath = ""
  static serverFolderPath = ""
  static needUpdate = false;
  static migrateError = ""
  static prismaPath = ""
  static migrateExePath = ""

  static initPath() {

    if (DBManager.serverFolderPath) {
      // already init
      return;
    }

    let db_url = ""

    // TODO:
    if (isDebug) {

      // it is a file path in dev mode, but after webpack bundles in production, it is just some string, e.g. 4569
      DBManager.prismaPath = require.resolve('prisma')

      DBManager.serverFolderPath = `../server/`;
      DBManager.schemaPath = `${DBManager.serverFolderPath}prisma/schema.prisma`;

      db_url = path.resolve(`${process.cwd()}/../server/prisma/dev.db`);

      // db_url = `${__dirname}/../server/prisma/dev.db`; // works but not good. dirname is some webpack main file location 
      // app.getPath() ~/git/xwin/electron in dev mode 

      // for testing 
      // DBManager.migrateExePath = `${DBManager.serverFolderPath}/migration-engine-darwin-arm64`;
      // DATABASE_URL = sqlitePathInProd;
    } else {
      
      // **/Resources/
      // after resolve, no final /
      DBManager.serverFolderPath = path.resolve(`${app.getAppPath()}/../`) //`${__dirname}/../../../`;
      // DBManager.serverFolderPath = "/Users/grimmer/git/xwin/electron/out/XWin-darwin-arm64/XWin.app/Contents/Resources"
      DBManager.schemaPath = `${DBManager.serverFolderPath}/prisma/schema.prisma`;
      db_url = sqlitePathInProd;
      DBManager.prismaPath = `${DBManager.serverFolderPath}/build/index.js`

      DBManager.migrateExePath = `${DBManager.serverFolderPath}/migration-engine-darwin-arm64`;

    }
    DBManager.databaseFilePath = db_url
  }

  static async dbMigration(){

    process.env.DATABASE_URL = `file:${DBManager.databaseFilePath}`;
    // const common = `/Users/grimmer/git/xwin/server/node_modules/@prisma/engines/`;
    // const PRISMA_QUERY_ENGINE_BINARY = `${common}libquery_engine-darwin-arm64.dylib.node`;
    // const PRISMA_QUERY_ENGINE_LIBRARY = `${common}libquery_engine-darwin-arm64.dylib.node`;
    // const PRISMA_MIGRATION_ENGINE_BINARY = `${common}migration-engine-darwin-arm64`;

    if (DBManager.migrateExePath) {
      process.env.PRISMA_MIGRATION_ENGINE_BINARY = DBManager.migrateExePath;
    }

    try {
      await prisma('migrate', "dev", `--schema=${DBManager.schemaPath}`)
    } catch (err) {
      DBManager.migrateError = DBManager.migrateError+err;
      console.log({err})
    }
      
  }

  static getUsedVersion(): string {
    if (!existsSync(dbUsedVersionTxtPath)) {
    return  
    }
    try {
     const data = readFileSync(dbUsedVersionTxtPath, 'utf8');
     return data;
    } catch (err) {
      console.error(err);
      return 
    }
  }
  static updateUsedVersion(ver: string)  {    

    try {
      writeFileSync(dbUsedVersionTxtPath, ver);
    } catch (err) {
      console.error(err);
      return 
    }
 }

  static async doMigrationToVersion(ver:string ) {
    await DBManager.dbMigration();
    DBManager.updateUsedVersion(ver);
  }

  static async checkNeedMigration(): Promise<string> {

    this.initPath();
    const dbVersion = DBManager.getUsedVersion();
    let schemaPackageVersion = app.getVersion();

    console.log("db databaseFilePath:", DBManager.databaseFilePath)
    if (existsSync(DBManager.databaseFilePath)) {
      if (dbVersion !== schemaPackageVersion) {
        DBManager.needUpdate = true;
        return schemaPackageVersion;
      } else {
        console.log("db file exist and version is same")
      } 
    } else {      
      DBManager.needUpdate = true;
      return schemaPackageVersion;
    }
  }
}
