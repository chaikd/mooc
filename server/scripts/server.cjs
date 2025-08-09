// start.cjs
const serverPath = resolve(__dirname, '../dist/server.mjs')
import(serverPath)
  .then(mod => mod.default?.())
  .catch(err => {
    console.error(err);
    process.exit(1);
  });