# ri-loader

No-nonsense responsive images.

Instead of requiring you to specify which image sizes you want via query strings, ri-loader generates an array of sizes covering the whole range of possibilities.  See the `generateSizes` function to get an idea of the heuristics.

ri-loader uses the [debug](https://www.npmjs.com/package/debug) module.  Set the `DEBUG` environment variable to `ri-loader:progress` so see image bundling progress and `ri-loader:*` to see debug output.
