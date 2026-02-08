import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import FileUploader from "./FileUploader";
import FileThumbnailList from "./FileThumbnailList";
import FileViewer from "./FileViewer";

export default function CaseFilesModal({ caseId, close }) {
  const [files, setFiles] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(null);

  // 🔥 Load existing files when modal opens
  useEffect(() => {
  if (!caseId) return;

  const docsRef = ref(db, `register/${caseId}/documents`);

  const unsubscribe = onValue(docsRef, (snapshot) => {
    const data = snapshot.val();
    setFiles(data ? Object.values(data) : []);
  });

  return () => unsubscribe(); // ⭐ CRITICAL LINE
}, [caseId]);


  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-50">
   
      
     <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <h2 className="text-xl font-bold mb-4">Case Documents</h2>

        {/* Upload new files */}
        <FileUploader
          caseId={caseId}
          onUpload={(newFiles) =>
            setFiles((prev) => [...prev, ...newFiles])
          }
        />

        {/* Show all thumbnails */}
        <FileThumbnailList files={files} openViewer={setViewerIndex} />

        <button
          onClick={close}
          className="mt-4 bg-gray-500 text-white px-4 py-2 rounded"
        >
          Close
        </button>
      </div>

      {/* Fullscreen Viewer */}
      {viewerIndex !== null && (
        <FileViewer
          files={files}
          index={viewerIndex}
          close={() => setViewerIndex(null)}
          next={() => setViewerIndex((i) => i + 1)}
          prev={() => setViewerIndex((i) => i - 1)}
        />
      )}
    </div>
  );
}
