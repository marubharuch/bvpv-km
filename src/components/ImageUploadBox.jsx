import { useRef, useState, useCallback } from "react";
import { ref, update } from "firebase/database";
import { db } from "../firebase";

import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";

import { uploadToCloudinary } from "../services/cloudinaryService";

export default function ImageUploadBox({
  familyId,
  memberId,
  photoUrl
}) {
  const fileInput = useRef();

  const [uploading, setUploading] = useState(false);

  // ⭐ NEW STATES FOR EDITOR
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleClick = () => {
    if (photoUrl) {
      const replace = window.confirm("Replace existing photo?");
      if (!replace) return;
    }
    fileInput.current.click();
  };

  // 📂 SELECT FILE
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image allowed");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // 🚀 FINAL UPLOAD (YOUR ORIGINAL CODE INSIDE)
  const handleUpload = async () => {
    setUploading(true);

    try {
      // Create canvas crop
      const canvas = document.createElement("canvas");
      const image = new Image();
      image.src = imageSrc;

      await new Promise((res) => (image.onload = res));

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      const ctx = canvas.getContext("2d");

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      ctx.restore();

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );

      // ⭐ Compress
      const compressed = await imageCompression(blob, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 800,
        useWebWorker: true
      });

      // ⭐ Upload to Cloudinary (UNCHANGED)
      const url = await uploadToCloudinary(compressed);

      // ⭐ Save URL to RTDB (UNCHANGED)
      await update(
        ref(db, `members/${memberId}`),
        {
          photoUrl: url,
          updatedAt: Date.now()
        }
      );

      setImageSrc(null);

    } catch (err) {
      alert("Upload failed");
      console.error(err);
    }

    setUploading(false);
  };

  return (
    <div className="flex flex-col items-center">

      {/* PHOTO BOX */}
      <div
        onClick={handleClick}
        className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center cursor-pointer border-2 border-gray-300"
      >
        {uploading ? (
          <span className="text-xs">Uploading...</span>
        ) : photoUrl ? (
          <img src={photoUrl} alt="member" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl text-gray-500">📷</span>
        )}
      </div>

      {/* HIDDEN INPUT */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        hidden
      />

      {/* ⭐ CROP EDITOR MODAL */}
      {imageSrc && (
        <div className="fixed inset-0  z-[100]  bg-black/90 flex flex-col items-center justify-center">

          <div className="relative w-80 h-80 bg-black">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* CONTROLS */}
          <div className="flex gap-2 mt-4">

            <button
              onClick={() => setRotation(r => r - 90)}
              className="bg-gray-700 text-white px-3 py-1 rounded"
            >
              Rotate
            </button>

            <button
              onClick={handleUpload}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Upload
            </button>

            <button
              onClick={() => setImageSrc(null)}
              className="bg-red-500 text-white px-3 py-2 rounded"
            >
              Cancel
            </button>

          </div>
        </div>
      )}
      {uploading && (
  <div className="fixed inset-0 z-[9999] bg-black/70 flex flex-col items-center justify-center">
    
    {/* Spinner */}
    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>

    {/* Text */}
    <p className="text-white mt-4">Uploading photo...</p>

  </div>
)}
    </div>
  );
}