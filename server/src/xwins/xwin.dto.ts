// // class Item(BaseModel):
// //     paths: list[str]
// //     workspace_path:str
// //     deactivate = False
// // @Controller('xwins')

export class CreateXwinDto {
  paths: string[];
  workspace_path: string;

  /* should always false since there is no way found to detect close/deactivate window event) */
  // deactivate = false;
}
