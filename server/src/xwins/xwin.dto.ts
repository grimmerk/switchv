// // class Item(BaseModel):
// //     paths: list[str]
// //     workspace_path:str
// //     deactivate = False
// // @Controller('xwins')

export class CreateXwinDto {
  paths: string[];
  workspace_path: string;
  deactivate = false;
}
