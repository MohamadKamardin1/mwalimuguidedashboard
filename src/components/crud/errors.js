/**
 * Split an API failure into one message for the form and, where the server said
 * which field was at fault, a message per field.
 *
 * The backend does not currently attach a field to its errors -- a resolver
 * raising `ValueError` arrives as a plain message -- so in practice everything
 * lands in `general`. The shape is here so that when a resolver starts sending
 * `extensions.field`, forms pick it up without changing.
 */
export function mapApiError(error) {
  if (!error) return { general: "", fields: {} };

  const extensions = error.extensions || {};
  if (extensions.field) {
    return { general: "", fields: { [extensions.field]: error.message } };
  }

  return { general: error.message || String(error), fields: {} };
}
