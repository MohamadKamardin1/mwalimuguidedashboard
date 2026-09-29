/**
 * The only way this app talks to the backend: one GraphQL endpoint, over fetch.
 *
 * The endpoint comes from `@/config`, which reads VUE_APP_GRAPHQL_URL. There is
 * deliberately no fallback URL -- silently pointing at the wrong backend is
 * worse than failing loudly.
 *
 * The access token is read from the auth store and sent as a bearer token. On
 * a UNAUTHENTICATED reply the client refreshes once and replays the original
 * request; if that fails the session is dropped and the user is sent to /login.
 */

import { requireApiUrl } from "@/config";
import { withRetry } from "@/lib/net";

/** A GraphQL failure with the backend's machine-readable code kept intact. */
export class ApiError extends Error {
  constructor(message, code, extensions) {
    super(message);
    this.name = "ApiError";
    this.code = code || "UNKNOWN";
    this.extensions = extensions || {};
  }
}

/**
 * The store is imported lazily, inside the call, because `stores/auth` imports
 * this module: a top-level import would be a cycle.
 */
async function authStore() {
  const { useAuthStore } = await import("@/stores/auth");
  return useAuthStore();
}

function endpoint() {
  try {
    return requireApiUrl();
  } catch (error) {
    throw new ApiError(error.message, "CONFIG_MISSING");
  }
}

/** The first GraphQL error, as an ApiError the caller can branch on. */
function toApiError(body, status) {
  const [first] = body.errors || [];
  if (!first) {
    return new ApiError(`The API replied ${status}.`, "HTTP_ERROR");
  }
  return new ApiError(
    first.message,
    first.extensions && first.extensions.code,
    first.extensions
  );
}

async function readBody(response) {
  try {
    return await response.json();
  } catch (error) {
    throw new ApiError(
      `The API replied ${response.status} and no JSON.`,
      "BAD_RESPONSE"
    );
  }
}

async function send(body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(endpoint(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const parsed = await readBody(response);
  if (parsed.errors && parsed.errors.length) {
    throw toApiError(parsed, response.status);
  }
  return parsed.data;
}

/**
 * Run a GraphQL operation, refreshing once if the token has gone stale.
 *
 * @param {string} query
 * @param {object} [variables]
 * @returns {Promise<object>} the `data` payload
 */
export async function gql(query, variables = {}) {
  const auth = await authStore();

  try {
    return await send({ query, variables }, auth.accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== "UNAUTHENTICATED") {
      throw error;
    }

    // One silent refresh, then one retry. `refreshAndKeep` is a no-op that
    // reports failure, so a client with no refresh token does not loop.
    const refreshed = await auth.refreshAndKeep();
    if (!refreshed) {
      await auth.sessionExpired();
      throw error;
    }

    try {
      return await send({ query, variables }, auth.accessToken);
    } catch (retryError) {
      if (retryError instanceof ApiError && retryError.code === "UNAUTHENTICATED") {
        await auth.sessionExpired();
      }
      throw retryError;
    }
  }
}

/**
 * Upload a file alongside a GraphQL mutation, per the GraphQL multipart
 * request spec: the file goes in `variables.file` (or the path given by
 * `filePath`) and the form carries the `operations`/`map` pair the server
 * expects. No Content-Type header is set -- the browser must add the multipart
 * boundary itself.
 *
 * @param {string} query
 * @param {object} variables the mutation variables, minus the file
 * @param {File} file
 * @param {string} [filePath] where in `variables` the file belongs
 */
export async function uploadGql(query, variables, file, filePath = "file") {
  const auth = await authStore();

  const operations = { query, variables: { ...variables, [filePath]: null } };
  const map = { 0: [`variables.${filePath}`] };

  const form = new FormData();
  form.append("operations", JSON.stringify(operations));
  form.append("map", JSON.stringify(map));
  form.append("0", file);

  const headers = {};
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;

  const response = await fetch(endpoint(), {
    method: "POST",
    headers,
    body: form,
  });

  const parsed = await readBody(response);
  if (parsed.errors && parsed.errors.length) {
    throw toApiError(parsed, response.status);
  }
  return parsed.data;
}

/**
 * Upload several files for one field, reporting progress as it goes.
 *
 * Uses XMLHttpRequest rather than fetch because only XHR exposes upload
 * progress, and this screen is used on connections where a progress bar is
 * the difference between waiting and giving up.
 *
 * @param {string} query
 * @param {object} variables the operation's variables, minus the files
 * @param {File[]} files
 * @param {{ fieldPath?: string, onProgress?: (fraction: number) => void }} [options]
 */
export async function uploadManyGql(query, variables, files, options = {}) {
  const fieldPath = options.fieldPath || "files";
  const auth = await authStore();

  // A dropped connection mid-upload is worth another go: re-photographing a
  // page is a real cost to the teacher, a two-second wait is not.
  return withRetry(() => sendUpload({ query, variables, files, fieldPath, auth, options }), {
    onRetry: (attempt, wait) => {
      if (options.onRetry) options.onRetry(attempt, wait);
    },
  });
}

function sendUpload({ query, variables, files, fieldPath, auth, options }) {

  // A list variable has to be a list of placeholders, not a bare null: the
  // server walks each file's path and assigns into the array, so a null in its
  // place fails with "NoneType object does not support item assignment".
  const operations = {
    query,
    variables: {
      ...variables,
      [fieldPath]: files.map(() => null),
    },
  };
  const map = {};
  const form = new FormData();
  files.forEach((file, index) => {
    map[index] = [`variables.${fieldPath}.${index}`];
    form.append(String(index), file);
  });
  form.append("operations", JSON.stringify(operations));
  form.append("map", JSON.stringify(map));

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", endpoint());

    if (auth.accessToken) {
      request.setRequestHeader("Authorization", `Bearer ${auth.accessToken}`);
    }
    // No Content-Type: the browser must add the multipart boundary itself.

    if (request.upload && options.onProgress) {
      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) options.onProgress(event.loaded / event.total);
      });
    }

    request.addEventListener("load", () => {
      let parsed;
      try {
        parsed = JSON.parse(request.responseText);
      } catch (error) {
        reject(new ApiError(`The API replied ${request.status} and no JSON.`, "BAD_RESPONSE"));
        return;
      }
      if (parsed.errors && parsed.errors.length) {
        reject(toApiError(parsed, request.status));
        return;
      }
      resolve(parsed.data);
    });

    request.addEventListener("error", () =>
      reject(new ApiError("The upload could not reach the server.", "NETWORK_ERROR"))
    );
    request.addEventListener("abort", () =>
      reject(new ApiError("The upload was cancelled.", "ABORTED"))
    );

    request.send(form);
  });
}
