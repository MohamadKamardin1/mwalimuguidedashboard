/**
 * Every environment value the app reads, in one place.
 *
 * Vue CLI inlines variables prefixed with `VUE_APP_` at build time -- a
 * `VITE_`-prefixed name would silently be `undefined` here, so the prefix is
 * part of the contract, not a detail.
 *
 * Copy `.env.example` to `.env` and set the endpoint.
 */

export const API_URL = process.env.VUE_APP_GRAPHQL_URL || "";

/** The endpoint, or a clear failure -- never a silent fallback URL. */
export function requireApiUrl() {
  if (!API_URL) {
    throw new Error(
      "VUE_APP_GRAPHQL_URL is not set. Copy .env.example to .env and set it, then restart the dev server."
    );
  }
  return API_URL;
}

export default { API_URL, requireApiUrl };
