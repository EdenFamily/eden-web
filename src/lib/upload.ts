/**
 * Token images for website launches. Any image the browser can open (PNG, JPEG, WEBP, a large photo) is cropped to a
 * centred square of at most 1024 px and saved as PNG (JPEG when the PNG would pass 2 MB), so every launch carries a
 * small, square logo. Animated GIFs go up unchanged. The server pins the file to IPFS and returns ipfs://<cid>.
 */
const API = import.meta.env.VITE_API_URL ?? "/api";
const MAX_SIDE = 1024, MAX_PNG = 2 * 1024 * 1024, MAX_UPLOAD = 4 * 1024 * 1024;

export async function prepareImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") {
    if (file.size > MAX_UPLOAD) throw new Error("That GIF is over 4 MB. Use a smaller one.");
    return file;
  }
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error("This browser can't open that file. Use a PNG, JPEG, GIF or WEBP image."); }
  const side = Math.min(bitmap.width, bitmap.height), out = Math.min(MAX_SIDE, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = out;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  bitmap.close();
  const blob = (type: string, q?: number) => new Promise<Blob>((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error("Couldn't prepare the image."))), type, q));
  const png = await blob("image/png");
  return png.size <= MAX_PNG ? png : blob("image/jpeg", 0.9);
}

/** Uploads a prepared image and resolves to its ipfs:// URI. `onProgress` gets 0–1. */
export function uploadImage(image: Blob, onProgress: (f: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/uploads/image`);
    xhr.setRequestHeader("content-type", image.type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let body: { logo?: string; message?: string } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status === 200 && body.logo?.startsWith("ipfs://")) resolve(body.logo);
      else reject(new Error(body.message ?? (xhr.status === 413 ? "That file is too large." : "The image didn't upload. Try again.")));
    };
    xhr.onerror = () => reject(new Error("The image didn't upload. Check your connection and try again."));
    xhr.send(image);
  });
}
