// start.cjs
const path = require('path')
import(path.resolve(__dirname, '../server.mjs'))
  .then(mod => mod.default?.())
  .catch(err => {
    console.error(err);
    process.exit(1);
  });