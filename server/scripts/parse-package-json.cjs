import { readFile, writeFileSync } from "fs";

const packagePath = resolve(__dirname, '../package.json')
readFile(packagePath, {encoding: 'utf-8'}, (err, data) => {
  if(err) {
    throw Error('文件读取失败', err)
  }
  const str = data.replace('"@mooc/db-shared": "workspace:^",', '')
  writeFileSync(packagePath, str)
})