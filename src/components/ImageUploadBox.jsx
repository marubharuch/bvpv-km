import { useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { uploadToCloudinary } from "../services/cloudinaryService";
import { updateMemberPhoto } from "../services/memberService";

export default function ImageUploadBox({ familyId, memberId, photoURL,onPhotoUpdate  }) {
  const fileInput = useRef();
  const [uploading,         setUploading]         = useState(false);
  const [imageSrc,          setImageSrc]          = useState(null);
  const [crop,              setCrop]              = useState({ x: 0, y: 0 });
  const [zoom,              setZoom]              = useState(1);
  const [rotation,          setRotation]          = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleClick = () => {
    if (photoURL) {
      if (!window.confirm("Replace existing photo?")) return;
    }
    fileInput.current.click();
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Only image allowed"); return; }
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleUpload = async () => {
    setUploading(true);
    try {
      const canvas = document.createElement("canvas");
      const image  = new Image();
      image.src    = imageSrc;
      await new Promise(res => (image.onload = res));

      canvas.width  = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx     = canvas.getContext("2d");

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      ctx.drawImage(
        image,
        croppedAreaPixels.x, croppedAreaPixels.y,
        croppedAreaPixels.width, croppedAreaPixels.height,
        0, 0, croppedAreaPixels.width, croppedAreaPixels.height
      );
      ctx.restore();

      const blob       = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
      const compressed = await imageCompression(blob, { maxSizeMB: 0.4, maxWidthOrHeight: 800, useWebWorker: true });
      const url        = await uploadToCloudinary(compressed);

      await updateMemberPhoto(memberId, url);

      // ✅ notify parent immediately — no refresh needed
      if (onPhotoUpdate) onPhotoUpdate(memberId, url);

      setImageSrc(null);
    } catch (err) {
      alert("Upload failed");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        onClick={handleClick}
        className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center cursor-pointer border-2 border-gray-300"
      >
        {uploading
          ? <span className="text-xs">...</span>
          : photoURL
            ? <img src={photoURL} alt="member" className="w-full h-full object-cover" />
            : <span className="text-2xl text-gray-500">📷</span>
        }
      </div>

      <input ref={fileInput} type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />

      {imageSrc && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
          <div className="relative w-80 h-80 bg-black">
            <Cropper
              image={imageSrc} crop={crop} zoom={zoom} rotation={rotation}
              aspect={1} cropShape="round"
              onCropChange={setCrop} onZoomChange={setZoom}
              onRotationChange={setRotation} onCropComplete={onCropComplete}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setRotation(r => r - 90)} className="bg-gray-700 text-white px-3 py-1 rounded">Rotate</button>
            <button onClick={handleUpload} className="bg-blue-500 text-white px-4 py-2 rounded">Upload</button>
            <button onClick={() => setImageSrc(null)} className="bg-red-500 text-white px-3 py-2 rounded">Cancel</button>
          </div>
        </div>
      )}

      {uploading && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white mt-4">Uploading photo...</p>
        </div>
      )}
    </div>
  );
}
