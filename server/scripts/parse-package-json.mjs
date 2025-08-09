import { readFile, writeFileSync } from "fs";

readFile('./package.json', {encoding: 'utf-8'}, (err, data) => {
  if(err) {
    throw Error('文件读取失败', err)
  }
  const str = data.replace('"@mooc/db-shared": "workspace:^",', '')
  writeFileSync('./package.json', str)
})