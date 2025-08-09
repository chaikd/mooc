// start.cjs
import { resolve } from "path";

const serverPath = resolve(__dirname, '../server.mjs')
import(serverPath)
  .then(mod => mod.default?.())
  .catch(err => {
    console.error(err);
    process.exit(1);
  });