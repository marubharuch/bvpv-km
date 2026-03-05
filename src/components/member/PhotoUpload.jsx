// components/member/PhotoUpload.jsx
import { useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { uploadImage }       from "../../lib/cloudinary";
import { updateMemberPhoto } from "../../db/memberDb";
import { getCroppedImg }     from "../../lib/cropImage";
import { COLORS }            from "../../constants/app";

export default function PhotoUpload({ memberId, photoURL, honoraryOrgs = [], onUpdate }) {
  const galleryRef = useRef();
  const cameraRef  = useRef();

  const [local,     setLocal]     = useState(photoURL);
  const [showOpts,  setShowOpts]  = useState(false);
  const [src,       setSrc]       = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState("");
  const [crop,      setCrop]      = useState({ x: 0, y: 0 });
  const [zoom,      setZoom]      = useState(1);
  const [rotation,  setRotation]  = useState(0);
  const [pixels,    setPixels]    = useState(null);

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    galleryRef.current.value = "";
    cameraRef.current.value  = "";
    setShowOpts(false);
    setError("");
    const r = new FileReader();
    r.onload = () => { setZoom(1); setRotation(0); setCrop({ x: 0, y: 0 }); setSrc(r.result); };
    r.readAsDataURL(f);
  };

  const onCropComplete = useCallback((_, px) => setPixels(px), []);

  const handleCancel = () => { setSrc(null); setError(""); };

  const handleUpload = async () => {
    setUploading(true);
    setError("");
    try {
      const cropped    = await getCroppedImg(src, pixels, rotation);
      const blob       = await fetch(cropped).then(r => r.blob());
      const compressed = await imageCompression(blob, { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true });
      const url        = await uploadImage(compressed, "member-photos");
      await updateMemberPhoto(memberId, url, honoraryOrgs);
      onUpdate?.(memberId, url);
      setLocal(url);
      setSrc(null);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">

      {/* Avatar */}
      <div onClick={() => setShowOpts(true)}
        className="relative w-14 h-14 rounded-full overflow-hidden flex items-center justify-center cursor-pointer border-2 shadow-md flex-shrink-0"
        style={{ background: "#f0e6e6", borderColor: COLORS.border }}>
        {local
          ? <img src={local} alt="" className="w-full h-full object-cover" />
          : <span style={{ fontSize: 22, opacity: 0.4 }}>👤</span>}
        <div className="absolute inset-0 bg-black opacity-0 hover:opacity-20 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs">📷</span>
        </div>
      </div>

      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} hidden />
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />

      {/* Options bottom sheet */}
      {showOpts && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowOpts(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-5 space-y-3 bg-white" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto" style={{ background: COLORS.border }} />
            {[
              { label: "📷 Camera",  onClick: () => cameraRef.current.click() },
              { label: "🖼 Gallery", onClick: () => galleryRef.current.click() },
              { label: "Cancel",     onClick: () => setShowOpts(false), muted: true },
            ].map(b => (
              <button key={b.label} onClick={b.onClick}
                className="w-full py-3.5 rounded-xl text-sm font-semibold"
                style={{ background: b.muted ? "#f9f9f9" : "#FDE8EC", color: b.muted ? COLORS.textMuted : COLORS.primary }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Crop modal — z-[200] sits above navbar (z-50) */}
      {src && (
        <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "#000" }}>

          {/* Cropper area */}
          <div className="relative flex-1">
            <Cropper
              image={src} crop={crop} zoom={zoom} rotation={rotation} aspect={1}
              cropShape="round" showGrid={false}
              onCropChange={setCrop} onZoomChange={setZoom}
              onRotationChange={setRotation} onCropComplete={onCropComplete}
            />
          </div>

          {/* Controls */}
          <div className="p-4 space-y-3" style={{ background: "#111" }}>
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Zoom</p>
                <input type="range" min={1} max={3} step={0.05} value={zoom}
                  onChange={e => setZoom(Number(e.target.value))} className="w-full accent-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Rotate</p>
                <input type="range" min={0} max={360} step={1} value={rotation}
                  onChange={e => setRotation(Number(e.target.value))} className="w-full accent-white" />
              </div>
            </div>

            {error && (
              <p className="text-xs text-center" style={{ color: "#ff6b6b" }}>{error}</p>
            )}

            <div className="flex gap-3">
              <button onClick={handleCancel} disabled={uploading}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold"
                style={{ background: "#2a2a2a", color: "#fff" }}>
                Cancel
              </button>
              <button onClick={handleUpload} disabled={uploading}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: COLORS.primary }}>
                {uploading ? "Uploading…" : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}