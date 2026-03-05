// lib/cloudinary.js — Cloudinary upload helpers.
// Required env vars: VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET
const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const MAX_FILE_SIZE_MB = 10;
const MAX_BYTES        = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Upload a File or base64 string. Returns secure_url. */
export async function uploadImage(file, folder = "member-photos") {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary env vars not set. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env");
  }

  let imageFile = file;
  if (typeof file === "string" && file.startsWith("data:image")) {
    imageFile = await _base64ToFile(file);
  }
  if (!(imageFile instanceof File || imageFile instanceof Blob)) {
    throw new Error("Invalid file");
  }
  if (imageFile.size > MAX_BYTES) {
    throw new Error(`Image too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
  }

  const API_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const form = new FormData();
  form.append("file",           imageFile);
  form.append("upload_preset",  UPLOAD_PRESET);
  form.append("folder",         folder);
  form.append("tags",           "member,profile");

  const res = await fetch(API_URL, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Upload failed: ${res.status}`);
  }
  const data = await res.json();
  return data.secure_url;
}

/** Build a Cloudinary transformation URL. */
export function transformUrl(url, { w = 300, h = 300, crop = "fill", gravity = "face" } = {}) {
  if (!url?.includes("cloudinary.com")) return url;
  try {
    const u     = new URL(url);
    const parts = u.pathname.split("/");
    const idx   = parts.indexOf("upload");
    if (idx === -1) return url;
    // remove old transform if present
    if (parts[idx + 1]?.includes("_")) parts.splice(idx + 1, 1);
    parts.splice(idx + 1, 0, `c_${crop},g_${gravity},w_${w},h_${h},q_auto,f_auto`);
    u.pathname = parts.join("/");
    return u.toString();
  } catch { return url; }
}

async function _base64ToFile(b64, name = "photo.jpg") {
  const [header, data] = b64.split(",");
  const mime   = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}