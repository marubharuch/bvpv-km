import { useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { updateMemberPhoto } from "../../services/memberService";
import { getCroppedImg } from "../../utils/cropImage";

export default function PhotoUploadPro({ memberId, photoURL, onPhotoUpdate }) {
  const galleryInput = useRef();
  const cameraInput  = useRef();

  const [localPhoto,        setLocalPhoto]        = useState(photoURL);
  const [showOptions,       setShowOptions]       = useState(false);
  const [imageSrc,          setImageSrc]          = useState(null);
  const [uploading,         setUploading]         = useState(false);
  const [crop,              setCrop]              = useState({ x: 0, y: 0 });
  const [zoom,              setZoom]              = useState(1);
  const [rotation,          setRotation]          = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    galleryInput.current.value = "";
    cameraInput.current.value  = "";
    setShowOptions(false);
    const reader = new FileReader();
    reader.onload = () => {
      setZoom(1);
      setRotation(0);
      setCrop({ x: 0, y: 0 });
      setImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleUpload = async () => {
    setUploading(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      const blob         = await fetch(croppedImage).then(r => r.blob());
      const compressed   = await imageCompression(blob, {
        maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true,
      });
      const url = await uploadToCloudinary(compressed);
      await updateMemberPhoto(memberId, url);
      if (onPhotoUpdate) onPhotoUpdate(memberId, url);
      setLocalPhoto(url);
      setImageSrc(null);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">

      {/* Avatar */}
      <div
        onClick={() => {
          if (photoURL && !window.confirm("Replace existing photo?")) return;
          setShowOptions(true);
        }}
        className="relative w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center cursor-pointer border-2 border-white shadow-md"
      >
        {localPhoto
          ? <img src={localPhoto} alt="" className="w-full h-full object-cover" />
          : <span style={{ fontSize: 28, opacity: 0.35 }}>👤</span>}
        
      </div>

      {/* Hidden file inputs */}
      <input ref={galleryInput} type="file" accept="image/*" onChange={handleFile} hidden />
      <input ref={cameraInput}  type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />

      {/* Bottom sheet — Camera or Gallery */}
      {showOptions && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setShowOptions(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl pb-8 pt-4 px-4 bg-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-5" />
            <p className="text-base font-extrabold text-gray-800 text-center mb-5">Profile Photo</p>

            <div className="flex gap-3 mb-4">
              {/* Gallery */}
              <button
                onClick={() => galleryInput.current.click()}
                className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-gray-200 bg-gray-50 cursor-pointer"
              >
                <span className="text-4xl">🖼️</span>
                <span className="text-sm font-bold text-gray-700">Select Photo</span>
                <span className="text-xs text-gray-400">from Device</span>
              </button>

              {/* Camera */}
              <button
                onClick={() => cameraInput.current.click()}
                className="flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-blue-100 bg-blue-50 cursor-pointer"
              >
                <span className="text-4xl">📷</span>
                <span className="text-sm font-bold text-blue-700">Use Camera</span>
                <span className="text-xs text-blue-400">take a new photo</span>
              </button>
            </div>

            <button
              onClick={() => setShowOptions(false)}
              className="w-full py-3 rounded-2xl text-sm font-bold text-gray-500 bg-gray-100 border-0 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Crop / Rotate modal */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">

          <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
            <button
              onClick={() => setImageSrc(null)}
              className="text-sm font-bold text-white bg-white/10 px-4 py-2 rounded-xl border-0 cursor-pointer"
            >
              Cancel
            </button>
            <p className="text-sm font-extrabold text-white tracking-wide">Adjust Photo</p>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="text-sm font-extrabold px-4 py-2 rounded-xl border-0 cursor-pointer disabled:opacity-50"
              style={{ background: uploading ? "#334155" : "#3B82F6", color: "#fff" }}
            >
              {uploading ? "Saving..." : "Save"}
            </button>
          </div>

          <div
            className="relative flex-1 mx-4 rounded-2xl overflow-hidden my-3"
            style={{ background: "#111" }}
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="shrink-0 px-4 pb-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-10 text-right font-semibold">Zoom</span>
              <input
                type="range" min={1} max={3} step={0.01}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-xs text-slate-400 w-10 font-semibold">{zoom.toFixed(1)}x</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-10 text-right font-semibold">Rotate</span>
              <input
                type="range" min={-180} max={180} step={1}
                value={rotation}
                onChange={e => setRotation(Number(e.target.value))}
                className="flex-1 accent-purple-500"
              />
              <span className="text-xs text-slate-400 w-10 font-semibold">{rotation}°</span>
            </div>

            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setRotation(r => r - 90)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white border-0 cursor-pointer"
                style={{ background: "#1e293b" }}
              >
                ↺ Left
              </button>
              <button
                onClick={() => { setRotation(0); setZoom(1); setCrop({ x: 0, y: 0 }); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border-0 cursor-pointer"
                style={{ background: "#1e293b" }}
              >
                Reset
              </button>
              <button
                onClick={() => setRotation(r => r + 90)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white border-0 cursor-pointer"
                style={{ background: "#1e293b" }}
              >
                Right ↻
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}