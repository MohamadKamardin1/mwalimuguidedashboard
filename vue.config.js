// vue.config.js
module.exports = {
  runtimeCompiler: true,
  // Asset URLs are relative, so the built app works whether it is served from
  // the domain root or a sub-path.
  publicPath: process.env.NODE_ENV === "production" ? "/vue-notus/" : "/",
  // Deep links (/admin/teachers and friends) are client-side routes, so the
  // dev server must hand any unmatched path to index.html instead of 404ing.
  devServer: {
    historyApiFallback: true,
  },
};
