/**
 * The whole navigation policy, as one pure decision.
 *
 * Kept out of main.js and free of any imports so it can be reasoned about --
 * and exercised -- on its own. `main.js` calls it after restoring the session.
 *
 * @param {{name?: string, fullPath: string, meta: object}} to  where the user is going
 * @param {{isAuthenticated: boolean, mustChangePassword: boolean, role: string|null, home: string}} auth
 * @returns {true | object} `true` to allow, or a route location to redirect to
 */
export function resolveNavigation(to, auth) {
  const meta = to.meta || {};

  if (!auth.isAuthenticated) {
    if (meta.public) return true;
    return {
      name: "login",
      query: to.fullPath === "/" ? {} : { redirect: to.fullPath },
    };
  }

  // An account still holding an administrator-issued password can go nowhere
  // else, whatever it asks for.
  if (auth.mustChangePassword && to.name !== "change-password") {
    return { name: "change-password" };
  }
  // ...and once it has been changed, that screen is finished with.
  if (!auth.mustChangePassword && to.name === "change-password") {
    return auth.home;
  }

  // Someone already signed in has no business on the sign-in page.
  if (to.name === "login") return auth.home;

  const roles = meta.roles;
  if (roles && roles.indexOf(auth.role) === -1) {
    return { name: "forbidden" };
  }

  return true;
}
