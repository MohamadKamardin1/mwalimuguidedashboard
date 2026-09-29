// vue.config.js
//
// Where the built assets are served from.
//
// This said `"/vue-notus/"` -- the Notus template's own demo path, which is
// nobody's deployment here. Every asset request went to a folder that does not
// exist, and a server that answers unknown paths with an HTML page (GitHub
// Pages does, from its 404.html) then replied to a `.js` request with HTML,
// which the browser refuses outright:
//
//   Failed to load module script: Expected a JavaScript-or-Wasm module script
//   but the server responded with a MIME type of "text/html".
//
// Three cases, in order:
//   - `PUBLIC_PATH` set, and it wins. For a local `npm run deploy` to Pages:
//       PUBLIC_PATH=/mwalimuguidedashboard/ npm run deploy
//   - running on GitHub Actions, where `GITHUB_REPOSITORY` is "owner/repo".
//     A project site is served from `/<repo>/`, so the name is enough and
//     nothing has to be written down twice. A user site ("<owner>.github.io")
//     is served from the root and is left alone.
//   - anywhere else, the domain root -- which is what the copy served by
//     Django wants.
function pagesPath() {
  if (process.env.PUBLIC_PATH) return process.env.PUBLIC_PATH;

  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return "/";

  const name = String(repo).split("/")[1] || "";
  if (!name || name.endsWith(".github.io")) return "/";
  return `/${name}/`;
}

module.exports = {
  runtimeCompiler: true,
  publicPath: pagesPath(),
  // Deep links (/admin/teachers and friends) are client-side routes, so the
  // dev server must hand any unmatched path to index.html instead of 404ing.
  devServer: {
    historyApiFallback: true,
  },
};
