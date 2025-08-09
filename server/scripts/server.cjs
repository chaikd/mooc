// start.cjs
import('../dist/server.mjs')
  .then(mod => mod.default?.())
  .catch(err => {
    console.error(err);
    process.exit(1);
  });