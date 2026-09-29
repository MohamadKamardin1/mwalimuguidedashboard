// vue.config.js
//
// Where the built assets are served from.
//
// This said `"/vue-notus/"` -- the Notus template's own demo path, which is
// nobody's deployment here. Every asset request went to a folder that does not
// exist, and a server that answers unknown paths with an HTML page then
// replied to a `.js` request with HTML, which the browser refuses outright:
//
//   Failed to load module script: Expected a JavaScript-or-Wasm module script
//   but the server responded with a MIME type of "text/html".
//
// Four cases, in order:
//   - `PUBLIC_PATH` set, and it wins. Only a GitHub Pages deploy needs it,
//     and `npm run deploy` sets it.
//   - running on Vercel, where the site is served from the domain root --
//     checked first and explicitly, so a project site path can never leak in.
//   - running on GitHub Actions, where `GITHUB_REPOSITORY` is "owner/repo".
//     A Pages *project* site is served from `/<repo>/`, so the name is enough
//     and nothing has to be written down twice. A user site
//     ("<owner>.github.io") is served from the root and is left alone.
//   - anywhere else, the domain root -- which is what the copy served by
//     Django wants.
function assetBase() {
  if (process.env.PUBLIC_PATH) return process.env.PUBLIC_PATH;
  if (process.env.VERCEL) return "/";

  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return "/";

  const name = String(repo).split("/")[1] || "";
  if (!name || name.endsWith(".github.io")) return "/";
  return `/${name}/`;
}

module.exports = {
  runtimeCompiler: true,
  publicPath: assetBase(),
  // Deep links (/admin/teachers and friends) are client-side routes, so the
  // dev server must hand any unmatched path to index.html instead of 404ing.
  devServer: {
    historyApiFallback: true,
  },
};
