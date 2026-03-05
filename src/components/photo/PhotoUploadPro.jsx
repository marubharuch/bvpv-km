import { useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { uploadImage }       from "../../lib/cloudinary";
import { updateMemberPhoto } from "../../db/memberDb";
import { getCroppedImg }     from "../../lib/cropImage";
import { COLORS }            from "../../constants/app";

export default function PhotoUpload({ memberId, photoURL, onUpdate }) {
  const galleryRef = useRef();
  const cameraRef  = useRef();

  const [local,     setLocal]     = useState(photoURL);
  const [showOpts,  setShowOpts]  = useState(false);
  const [src,       setSrc]       = useState(null);
  const [uploading, setUploading] = useState(false);
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
    const r = new FileReader();
    r.onload = () => { setZoom(1); setRotation(0); setCrop({ x: 0, y: 0 }); setSrc(r.result); };
    r.readAsDataURL(f);
  };

  const onCropComplete = useCallback((_, px) => setPixels(px), []);

  const handleUpload = async () => {
    setUploading(true);
    try {
      const cropped    = await getCroppedImg(src, pixels, rotation);
      const blob       = await fetch(cropped).then(r => r.blob());
      const compressed = await imageCompression(blob, { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true });
      const url        = await uploadImage(compressed, "member-photos");
      await updateMemberPhoto(memberId, url);
      onUpdate?.(memberId, url);
      setLocal(url);
      setSrc(null);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
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
        <div className="absolute bottom-0 left-0 right-0 h-5 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <span style={{ fontSize: 11 }}>📷</span>
        </div>
      </div>

      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} hidden />
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />

      {/* Options sheet */}
      {showOpts && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowOpts(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-5 space-y-3 bg-white"
            style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom,0px))" }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: COLORS.border }} />
            {[
              { label: "📷  Camera",  action: () => cameraRef.current.click() },
              { label: "🖼  Gallery", action: () => galleryRef.current.click() },
              { label: "Cancel",      action: () => setShowOpts(false), muted: true },
            ].map(b => (
              <button key={b.label} onClick={b.action}
                className="w-full py-3.5 rounded-xl text-sm font-semibold"
                style={{ background: b.muted ? "#f9f9f9" : "#FDE8EC", color: b.muted ? COLORS.textMuted : COLORS.primary }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Crop modal ── */}
      {src && (
        <div className="fixed inset-0 z-[400]" style={{ background: "#000", display: "flex", flexDirection: "column" }}>

          {/* TOP: Sliders — always visible at top */}
          <div style={{ background: "#111", padding: "12px 16px 10px", flexShrink: 0,
                        paddingTop: "calc(12px + env(safe-area-inset-top,0px))" }}>
            <p style={{ color: "#aaa", fontSize: 11, textAlign: "center", marginBottom: 8 }}>
              Pinch or use sliders to adjust
            </p>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#aaa", fontSize: 11 }}>🔍 Zoom</span>
                  <span style={{ color: "#666", fontSize: 11 }}>{zoom.toFixed(1)}×</span>
                </div>
                <input type="range" min={1} max={3} step={0.05} value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#C9A84C" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#aaa", fontSize: 11 }}>🔄 Rotate</span>
                  <span style={{ color: "#666", fontSize: 11 }}>{rotation}°</span>
                </div>
                <input type="range" min={0} max={360} step={1} value={rotation}
                  onChange={e => setRotation(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#C9A84C" }} />
              </div>
            </div>
          </div>

          {/* MIDDLE: Cropper */}
          <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
            <Cropper
              image={src}
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
              style={{ containerStyle: { background: "#000" } }}
            />
          </div>

          {/* BOTTOM: Cancel + Save — always at very bottom */}
          <div style={{
            background: "#111",
            padding: "12px 16px",
            paddingBottom: "calc(12px + env(safe-area-inset-bottom,0px))",
            flexShrink: 0,
            display: "flex",
            gap: 12,
          }}>
            <button
              onClick={() => setSrc(null)}
              disabled={uploading}
              style={{
                flex: 1, padding: "14px", borderRadius: 16,
                background: "#2a2a2a", color: "#ccc",
                fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
              }}>
              ✕ Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                flex: 1, padding: "14px", borderRadius: 16,
                background: uploading ? "#555" : COLORS.primary,
                color: COLORS.goldLight,
                fontWeight: 700, fontSize: 15, border: "none",
                cursor: uploading ? "not-allowed" : "pointer",
              }}>
              {uploading ? "Uploading…" : "✓ Save Photo"}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}