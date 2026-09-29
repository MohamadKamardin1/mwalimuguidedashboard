/**
 * Unsaved edits, kept on the device.
 *
 * A teacher checks a paper on a phone, in a classroom, on a connection that
 * comes and goes. Losing a corrected mark to a closed tab is the kind of thing
 * that stops people trusting the tool, so an edit in progress is written here
 * on every change and cleared only when the server has it.
 *
 * This is a safety net, not a sync queue: nothing is replayed automatically,
 * because a mark applied silently hours later is worse than one the teacher
 * knows they still have to save.
 */

const PREFIX = "zanzibar.draft.";

function key(name) {
  return `${PREFIX}${name}`;
}

/** Keep an edit. Silently does nothing when storage is unavailable. */
export function saveDraft(name, value) {
  try {
    window.localStorage.setItem(key(name), JSON.stringify(value));
  } catch (error) {
    // Private browsing, or a full disk. The page still works, it just will not
    // survive a reload.
  }
}

/** The edit kept for this name, or null. */
export function readDraft(name) {
  try {
    const raw = window.localStorage.getItem(key(name));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

/** Called once the server has the change, so the draft stops being offered. */
export function clearDraft(name) {
  try {
    window.localStorage.removeItem(key(name));
  } catch (error) {
    // Nothing to do: a stale draft is dropped the next time it is read back.
  }
}

/** Every draft name currently held, for a "you have unsaved work" prompt. */
export function draftNames() {
  const names = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const stored = window.localStorage.key(index);
      if (stored && stored.startsWith(PREFIX)) names.push(stored.slice(PREFIX.length));
    }
  } catch (error) {
    return [];
  }
  return names;
}
