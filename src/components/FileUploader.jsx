import { push, ref } from "firebase/database";
import { db } from "../firebase";
import { useState } from "react";
import axios from "axios";

export default function FileUploader({ caseId }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadPreset = "case_uploads";
  const cloudUrl = "https://api.cloudinary.com/v1_1/dm5qzcneg/auto/upload";

  const now = new Date();
  const folder = `${String(now.getFullYear()).slice(2)}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const handleUpload = async (fileList) => {
    if (!fileList.length || !caseId) return;

    setUploading(true);
    setProgress(0);

    try {
      for (let file of fileList) {
        const isImage = file.type.startsWith("image"); // ✅ moved here

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("folder", folder);

        const res = await axios.post(cloudUrl, formData, {
          onUploadProgress: (event) => {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProgress(percent);
          },
        });

        const data = res.data;

        const fileData = {
          type: isImage ? "image" : "pdf",
          url: isImage
            ? data.secure_url
            : data.secure_url.replace(
                "/raw/upload/",
                "/raw/upload/fl_attachment:false/"
              ),
          publicId: data.public_id,
          name: file.name,
          size: file.size,
          uploadedAt: Date.now(),
        };

        await push(ref(db, `register/${caseId}/documents`), fileData);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        multiple
        accept="image/*,.pdf"
        onChange={(e) => handleUpload(e.target.files)}
      />

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {uploading && (
        <div className="w-full bg-gray-200 rounded h-4 mt-2">
          <div
            className="bg-blue-600 h-4 rounded transition-all"
            style={{ width: `${progress}%` }}
          />
          <p className="text-xs mt-1 text-blue-600">{progress}% uploading...</p>
        </div>
      )}
    </div>
  );
}
