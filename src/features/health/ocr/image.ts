export type Crop = { left: number; top: number; right: number; bottom: number };
export const fullCrop: Crop = { left: 0, top: 0, right: 100, bottom: 100 };

export function cropGeometry(width: number, height: number, crop: Crop) {
  const x = Math.floor(width * crop.left / 100);
  const y = Math.floor(height * crop.top / 100);
  const w = Math.max(1, Math.floor(width * crop.right / 100) - x);
  const h = Math.max(1, Math.floor(height * crop.bottom / 100) - y);
  const scale = Math.min(1, 2048 / Math.max(w, h), Math.sqrt(4_000_000 / (w * h)));
  return { x, y, w, h, width: Math.max(1, Math.floor(w * scale)), height: Math.max(1, Math.floor(h * scale)) };
}

export async function cropImage(image: HTMLImageElement, crop: Crop, rotation: number) {
  const g = cropGeometry(image.naturalWidth, image.naturalHeight, crop);
  const canvas = document.createElement("canvas");
  const swapped = rotation % 180 !== 0;
  canvas.width = swapped ? g.height : g.width;
  canvas.height = swapped ? g.width : g.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare crop");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(rotation * Math.PI / 180);
  context.drawImage(image, g.x, g.y, g.w, g.h, -g.width / 2, -g.height / 2, g.width, g.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not prepare crop")), "image/jpeg", 0.92));
  canvas.width = canvas.height = 0;
  if (blob.size > 4 * 1024 * 1024) throw new Error("Crop is too large. Select a smaller area.");
  return blob;
}
