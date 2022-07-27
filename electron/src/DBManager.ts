import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import { existsSync } from 'fs';

// TODO: difference between __dirname & app.getAppPath
const path = require('path'); 

const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';



// './node_modules/prisma/build/index.js'
// console.log({prismaPath});

const dbFileName = "dev.db";
// '/Users/grimmer/Library/Application Support/Xwin'
const appDataPath = app.getPath("userData");
const dbUsedVersionTxtPath = `${appDataPath}/dbUsedVersion.txt`
export const sqlitePathInProd = `${appDataPath}/${dbFileName}`


import { readFile, writeFile } from 'fs/promises';
import { readFileSync, writeFileSync } from 'fs';
import { exec, fork } from 'child_process';


// ref: 
// https://github.com/prisma/prisma/issues/4703#issuecomment-1162417399
async function prisma(...args:any[]) {
  console.log(`Running \`prisma ${args.join(' ')}\``)
  // const execaCommand = (await import('execa')).execaCommand

  const command = `${DBManager.prismaPath}`
  // const command = `${prismaPath} ${args.join(' ')}`
  //const command = "/usr/local/bin/code /Users/grimmer/git"

  DBManager.migrateError += `;cmd:${command};`

  console.log({cmd:command})

  // https://stackoverflow.com/a/58291475/7354486, 
  // 但為何原本的 server process 可以跑 (exec 時會沒有預設 node path時)? 因為它已經是 vercel 了
  // Uncaught Error: spawn node ENOENT, 
  // 說找不到 build/index.js node not found 之類的
  // const subprocess = execaCommand(command)
  // subprocess.stdout?.pipe(process.stdout)
  // subprocess.stderr?.pipe(process.stderr)
  // await subprocess
  console.log("fork1");

  // const serverProcess = exec(command,  
  //     {env: {'DATABASE_URL': `file:${DBManager.databaseFilePath}`}}, 
  //     (error, stdout, stderr) => { 
  //     // TODO: figure out it why it does not print out
  //     console.log("print server log but seems it is never callbacked")
  //     console.log(error, stderr)      
  //     console.log(stdout);
  //   });

  // https://stackoverflow.com/a/58291475/7354486
  /** prisma migrate 也會自動產生　typescript file in @prisma/client, 所以 prisma/client 也要安裝 */
  const env = { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin` };
  // 看是要用 fork (上面 link 提到的可延用 node, 因為 spwan 會沒有預設 node process/path), 或是用　vercel/pkg 打包 prisma client (但要解決 package.json 問題)
  // electron 的 spawn 認不得 path (打包版會，沒打包版呢? 但現在打包版 code path 又正常了)??????
  // fork 會變成這樣: node "/usr/local/bin/code /Users/grimmer/git" 
  const child = fork(command, args, { env}); // cwd: TOOLS_DIR, 
  console.log("fork2");

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
    // server 包的裡面有 cli 嗎? 算了, electron 也包一份好了
    if (isDebug) {
      DBManager.prismaPath = require.resolve('prisma')

      DBManager.serverFolderPath = `../server/`;
      DBManager.schemaPath = `${DBManager.serverFolderPath}prisma/schema.prisma`;

      // 如果 dev 也用這裡 migrate 的話，就變成 server 的 .env 要寫死了, 算了
      // 這裡 __dirname 會是 webpack 的 
      // db_url = `${__dirname}/../server/prisma/dev.db`;

      // app.getPath() 會是 ~/git/xwin/electron 
      db_url = path.resolve(`${process.cwd()}/../server/prisma/dev.db`);


      // DBManager.migrateExePath = `${DBManager.serverFolderPath}/migration-engine-darwin-arm64`;

      // console.log({__filename})
      // console.log({__dirname});
      // console.log({"k:":process.cwd()})

      // for testing 
      // DATABASE_URL = sqlitePathInProd;
    } else {

      // DBManager.prismaPath = // require.resolve('prisma')


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

    // let schemaPath = ""
    // let DATABASE_URL = ""

    // TODO:
    // server 包的裡面有 cli 嗎? 算了, electron 也包一份好了
    // if (isDebug) {
    //   const serverPath = `../server/`;
    //   DBManager.schemaPath = `${serverPath}prisma/schema.prisma`;

    //   // 如果 dev 也用這裡 migrate 的話，就變成 server 的 .env 要寫死了, 算了
    //   DATABASE_URL = `./dev.db`;
    //   // for testing 
    //   // DATABASE_URL = sqlitePathInProd;
    // } else {
    //   const serverPath = `${__dirname}/../../../`;
    //   DBManager.schemaPath = `${serverPath}prisma/schema.prisma`;
    //   DATABASE_URL = sqlitePathInProd;
    // }
    // DBManager.databaseURL = DATABASE_URL


    process.env.DATABASE_URL = `file:${DBManager.databaseFilePath}`;


    // const common = `/Users/grimmer/git/xwin/server/node_modules/@prisma/engines/`;
    // const PRISMA_QUERY_ENGINE_BINARY = `${common}libquery_engine-darwin-arm64.dylib.node`;
    // const PRISMA_QUERY_ENGINE_LIBRARY = `${common}libquery_engine-darwin-arm64.dylib.node`;
    // const PRISMA_MIGRATION_ENGINE_BINARY = `${common}migration-engine-darwin-arm64`;

    if (DBManager.migrateExePath) {
      process.env.PRISMA_MIGRATION_ENGINE_BINARY = DBManager.migrateExePath;
    }

    // prisma generate --schema=./alternative/schema.prisma 
    // await prisma('migrate', 'deploy')
    try {
      await prisma('migrate', "dev", `--schema=${DBManager.schemaPath}`)
    } catch (err) {
      DBManager.migrateError = DBManager.migrateError+err;
      console.log({err})
    }

    console.log("done")
    
    // TODO:  create a prisma via do migration  
    // 不過 server 那邊已經先產生好一份 TypeScript interface 
    // 這裡重點應該是 db file 本身
    // schema 
    //  使用 DATABASE_URL 但產生完後, 
    //  是就直接讀 DATABASE_URL??  
    
    // schema file path:
    // https://www.prisma.io/docs/concepts/components/prisma-schema#prisma-schema-file-location
  }

  // TODO: use this instead of electron-store
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

    // NOTE: set version 
    // store.set('dbVersion', schemaPackageVersion);
    DBManager.updateUsedVersion(ver);
  }

  static async checkNeedMigration(): Promise<string> {

    this.initPath();

    // if (!process.env.EMBEDSERVER && isDebug) {
    //   return
    // }

    /** below does not work in production */  
    /** TODO: prisma execute path (prismaPath) in production not work, even UI does not show */
    // 1. normal: ./nodule_modules/prisma/build/index.js
    // 2. production: 4959

    // 看來有兩個東西 prisma index.js 另一個是 migrationEngine
    // https://github.com/prisma/prisma/issues/8449#issuecomment-887976268
    // https://github.com/prisma/prisma/issues/9613 
    // 

    console.log("in check");    

    const dbVersion = DBManager.getUsedVersion(); // store.get('dbVersion');
    let schemaPackageVersion = app.getVersion();

    console.log("check db file:", DBManager.databaseFilePath)
    if (existsSync(DBManager.databaseFilePath)) {


        // x 1. 如果有 app 更新的 callback, 則可以每次都執行 db migration, 因為不是 app 每次執行都會跑
        // 2. 不是每次都 db migration 
        //   1. * 手動寫一個 version 的檔案 -> 還不如用 package.json 之類的. yes
        //     app.getVersion().
        //   2. x prisma 可以自動產生 version 檔案
        //   3. 手動比較　schema 版本內容 (手動先產生 checksum 之類的)
      if (dbVersion !== schemaPackageVersion) {

        DBManager.needUpdate = true;

        // await DBManager.doMigrationToVersion(schemaPackageVersion)

        return schemaPackageVersion;
      } else {
        console.log("db file exist and version is same")
      } 
    } else {      
      DBManager.needUpdate = true;

      // await DBManager.dbMigration();

      return schemaPackageVersion;

      // store.set('dbVersion', schemaPackageVersion);
    }
    // 1. 更新 app 時，看是不是空的，是空的就建/傳一個新的.  prisma~~/sqlite3~~
    // 2. 不是空的，看有無需要更新 db schema，需要的話就 migrate  prisma~~/sqlite3~~。或是每次都執行 prisma migration, schema 一樣當然就不做事 (每次 app 都執行好像很煩，所以每次 electron 頂多包新版 schema，然後 sqlite 檔案要存在electron 某處+紀錄當前 schema version, schema 不一樣就執行 db migrate)。看是由 server/electron 來做這些都可以 (由 electron 來做，但 prisma lib 可否用 server 包的) 。
    // 3. 都不需要就保持原樣
  }
}


