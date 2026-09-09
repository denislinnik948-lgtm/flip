// .cjs because package.json sets "type": "module" for the core/test tooling,
// and Babel must be able to require() its config.
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
