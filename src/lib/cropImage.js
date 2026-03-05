// lib/cropImage.js — canvas-based crop helper for react-easy-crop
export async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImageBitmap(await (await fetch(imageSrc)).blob());
  const canvas  = document.createElement("canvas");
  const ctx     = canvas.getContext("2d");

  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bw  = Math.ceil(image.width  * cos + image.height * sin);
  const bh  = Math.ceil(image.width  * sin + image.height * cos);

  const offscreen = document.createElement("canvas");
  offscreen.width  = bw;
  offscreen.height = bh;
  const offCtx = offscreen.getContext("2d");
  offCtx.translate(bw / 2, bh / 2);
  offCtx.rotate(rad);
  offCtx.drawImage(image, -image.width / 2, -image.height / 2);

  canvas.width  = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(offscreen, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);

  return new Promise((res, rej) => canvas.toBlob(b => b ? res(URL.createObjectURL(b)) : rej(new Error("Canvas is empty")), "image/jpeg"));
}
