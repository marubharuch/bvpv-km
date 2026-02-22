import { useRef, useState } from "react";
import { ref, update } from "firebase/database";
import { db } from "../firebase";

import { uploadToCloudinary } from "../services/cloudinaryService";
export default function ImageUploadBox({
  familyId,
  memberId,
  photoUrl
}) {
  const fileInput = useRef();
  const [uploading, setUploading] = useState(false);

  const handleClick = () => {
    if (photoUrl) {
      const replace = window.confirm("Replace existing photo?");
      if (!replace) return;
    }
    fileInput.current.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image allowed");
      return;
    }

    setUploading(true);

    try {
      // ⭐ Upload to Cloudinary
      const url = await uploadToCloudinary(file);

      // ⭐ Save URL to RTDB
 await update(
  ref(db, `members/${memberId}`),
  {
    photoUrl: url,
    updatedAt: Date.now()
  }
);

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
          <img
            src={photoUrl}
            alt="member"
            className="w-full h-full object-cover"
          />
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

    </div>
  );
}
