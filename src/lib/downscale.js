/**
 * Shrink a photograph before it is uploaded.
 *
 * Phone cameras produce 4-8 MB images of a page that needs far less. Doing it
 * here rather than on the server saves the teacher's data on a weak
 * connection, which is the connection this screen is built for.
 */

/** The longest edge kept, in pixels. Enough for handwriting to stay legible. */
export const MAX_EDGE = 2000;

/** JPEG quality. Below ~0.8 the pencil strokes start to smear. */
export const QUALITY = 0.85;

/** Load a File into an <img> that can be drawn to a canvas. */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${file.name} could not be read as an image.`));
    };
    image.src = url;
  });
}

/** The size to draw at: unchanged if it already fits inside MAX_EDGE. */
export function scaledSize(width, height, maxEdge = MAX_EDGE) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const ratio = maxEdge / longest;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * Downscale and re-encode one image file.
 *
 * Returns the original file untouched when it is already small enough *and*
 * already a JPEG, so a good photo is not re-encoded for nothing. Anything the
 * canvas cannot decode is returned as-is too: a failed downscale must not cost
 * the teacher their photo, and the server validates what it receives anyway.
 *
 * @param {File} file
 * @returns {Promise<{ blob: Blob, name: string, width: number, height: number, originalBytes: number, bytes: number }>}
 */
export async function downscale(file) {
  const passthrough = {
    blob: file,
    name: file.name,
    width: 0,
    height: 0,
    originalBytes: file.size,
    bytes: file.size,
  };

  if (!file.type.startsWith("image/")) return passthrough;

  let image;
  try {
    image = await loadImage(file);
  } catch (error) {
    return passthrough;
  }

  const size = scaledSize(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const untouched = size.width === (image.naturalWidth || image.width);
  if (untouched && file.type === "image/jpeg") return passthrough;

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) return passthrough;
  // Photographs are not transparent; a white base stops a JPEG turning them black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(image, 0, 0, size.width, size.height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY)
  );
  if (!blob) return passthrough;

  // A re-encode that came out larger is not an improvement.
  if (blob.size >= file.size && untouched) return passthrough;

  return {
    blob,
    // The server reads the extension to decide how to decode it.
    name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
    width: size.width,
    height: size.height,
    originalBytes: file.size,
    bytes: blob.size,
  };
}

/** 1_234_567 -> "1.2 MB" */
export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
