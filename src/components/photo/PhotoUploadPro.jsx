import { useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { updateMemberPhoto } from "../../services/memberService";
import { getCroppedImg } from "../../utils/cropImage";

export default function PhotoUploadPro({ memberId, photoURL }) {
  const fileInput = useRef();

  const [imageSrc, setImageSrc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const openPicker = () => fileInput.current.click();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      const blob = await fetch(croppedImage).then(r => r.blob());
      const compressed = await imageCompression(blob, {
        maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true,
      });
      const url = await uploadToCloudinary(compressed);
      await updateMemberPhoto(memberId, url);
      setImageSrc(null);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        onClick={openPicker}
        className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center cursor-pointer border"
      >
        {photoURL
          ? <img src={photoURL} alt="" className="w-full h-full object-cover" />
          : "📷"}
      </div>

      <input ref={fileInput} type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />

      {imageSrc && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
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
            <button onClick={handleUpload} disabled={uploading} className="bg-blue-500 text-white px-4 py-2 rounded">
              {uploading ? "Uploading..." : "Save Photo"}
            </button>
            <button onClick={() => setImageSrc(null)} className="bg-red-500 text-white px-3 py-2 rounded">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
