/**
 * Every environment value the app reads, in one place.
 *
 * Vue CLI inlines variables prefixed with `VUE_APP_` at build time -- a
 * `VITE_`-prefixed name would silently be `undefined` here, so the prefix is
 * part of the contract, not a detail.
 *
 * The deployed backend is the default, because the deployed site has to work
 * without a build step that remembers to set it: `npm run build` on a laptop
 * and the deploy workflow both produce a site that talks to the live API, with
 * nothing configured. A local `.env` overrides it -- the development copy in
 * the backend repository points at `http://127.0.0.1:8000/graphql` -- so this
 * is the production value and not a hard-coded one.
 */

export const DEFAULT_API_URL = "https://mwalimuguide.mohamadkamardin.space/graphql";

export const API_URL = process.env.VUE_APP_GRAPHQL_URL || DEFAULT_API_URL;

/** The endpoint, or a clear failure -- never a silent guess. */
export function requireApiUrl() {
  if (!API_URL) {
    throw new Error(
      "VUE_APP_GRAPHQL_URL is not set and no default is compiled in. Set it in .env, then rebuild or restart the dev server."
    );
  }
  return API_URL;
}

export default { API_URL, DEFAULT_API_URL, requireApiUrl };
