module.exports = function runanywhereWebpackLoader(source) {
  if (!source.includes("@vite-ignore")) {
    return source;
  }
  return source.replace(
    /\/\*\s*@vite-ignore\s*\*\//g,
    "/* @vite-ignore */ /* webpackIgnore: true */"
  );
};
